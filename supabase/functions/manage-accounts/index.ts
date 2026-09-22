import { createClient, type User } from 'npm:@supabase/supabase-js@2.116.0'

type AppRole = 'requester' | 'finance_agent' | 'approver' | 'finance_admin'

const APP_URL = 'https://igrouptaichinh-png.github.io/igc-finance-connect/'
const allowedRoles: AppRole[] = ['requester', 'finance_agent', 'approver', 'finance_admin']

function allowedOrigin(origin: string | null) {
  if (!origin) return APP_URL.replace(/\/$/, '')
  if (origin === 'https://igrouptaichinh-png.github.io') return origin
  if (/^http:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(origin)) return origin
  return APP_URL.replace(/\/$/, '')
}

function corsHeaders(req: Request) {
  return {
    'Access-Control-Allow-Origin': allowedOrigin(req.headers.get('origin')),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
    'Vary': 'Origin',
  }
}

function json(req: Request, status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), { status, headers: corsHeaders(req) })
}

function defaultKey(jsonName: string, legacyName: string) {
  const values = Deno.env.get(jsonName)
  if (values) {
    try {
      const parsed = JSON.parse(values) as Record<string, string>
      if (parsed.default) return parsed.default
    } catch {
      // Fall through to legacy environment variables during key migration.
    }
  }
  return Deno.env.get(legacyName) || ''
}

function departmentName(relation: unknown) {
  if (Array.isArray(relation)) return relation[0]?.name || 'Chưa gán phòng ban'
  if (relation && typeof relation === 'object' && 'name' in relation) return String(relation.name)
  return 'Chưa gán phòng ban'
}

function presentAccount(authUser: User, profile: Record<string, unknown>) {
  return {
    id: authUser.id,
    fullName: String(profile.full_name || authUser.email?.split('@')[0] || 'Chưa đặt tên'),
    email: authUser.email || '',
    departmentId: profile.department_id ? Number(profile.department_id) : null,
    department: departmentName(profile.departments),
    role: profile.role as AppRole,
    active: Boolean(profile.is_active),
    source: 'supabase' as const,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  if (req.method !== 'POST') return json(req, 405, { error: 'Phương thức không được hỗ trợ.' })

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const publishableKey = defaultKey('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY')
  const secretKey = defaultKey('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY')
  const authorization = req.headers.get('Authorization')
  if (!supabaseUrl || !publishableKey || !secretKey) return json(req, 500, { error: 'Dịch vụ quản trị chưa được cấu hình đầy đủ.' })
  if (!authorization) return json(req, 401, { error: 'Vui lòng đăng nhập để tiếp tục.' })

  const userClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const admin = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const token = authorization.replace(/^Bearer\s+/i, '')
  const { data: authData, error: authError } = await userClient.auth.getUser(token)
  if (authError || !authData.user) return json(req, 401, { error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' })

  const { data: caller, error: callerError } = await admin
    .from('profiles')
    .select('user_id, role, is_active')
    .eq('user_id', authData.user.id)
    .maybeSingle()
  if (callerError) return json(req, 500, { error: 'Không thể kiểm tra quyền quản trị.' })
  if (!caller?.is_active || caller.role !== 'finance_admin') return json(req, 403, { error: 'Chỉ Finance Admin mới được quản trị tài khoản.' })

  let body: { action?: string; payload?: Record<string, unknown> }
  try {
    body = await req.json()
  } catch {
    return json(req, 400, { error: 'Dữ liệu gửi lên không hợp lệ.' })
  }

  if (body.action === 'list') {
    const [{ data: authUsers, error: usersError }, { data: profiles, error: profilesError }, { data: departments, error: departmentsError }] = await Promise.all([
      admin.auth.admin.listUsers({ page: 1, perPage: 200 }),
      admin.from('profiles').select('user_id, full_name, department_id, role, is_active, departments(name)').order('created_at', { ascending: false }),
      admin.from('departments').select('id, code, name, is_active').order('name'),
    ])
    if (usersError || profilesError || departmentsError) return json(req, 500, { error: 'Không thể tải danh bạ người dùng.' })
    const usersById = new Map(authUsers.users.map((item) => [item.id, item]))
    const accounts = (profiles || []).flatMap((profile) => {
      const authUser = usersById.get(profile.user_id)
      return authUser ? [presentAccount(authUser, profile)] : []
    })
    return json(req, 200, { data: {
      accounts,
      departments: (departments || []).map((item) => ({ id: item.id, code: item.code, name: item.name, active: item.is_active })),
    } })
  }

  if (body.action === 'invite') {
    const fullName = String(body.payload?.fullName || '').trim()
    const email = String(body.payload?.email || '').trim().toLowerCase()
    const departmentId = Number(body.payload?.departmentId)
    const role = body.payload?.role as AppRole
    if (fullName.length < 2 || fullName.length > 120) return json(req, 400, { error: 'Họ tên cần từ 2 đến 120 ký tự.' })
    if (!/^\S+@\S+\.\S+$/.test(email)) return json(req, 400, { error: 'Email công ty không hợp lệ.' })
    if (!Number.isInteger(departmentId) || departmentId <= 0) return json(req, 400, { error: 'Phòng ban không hợp lệ.' })
    if (!allowedRoles.includes(role)) return json(req, 400, { error: 'Vai trò không hợp lệ.' })

    const { data: department } = await admin.from('departments').select('id').eq('id', departmentId).eq('is_active', true).maybeSingle()
    if (!department) return json(req, 400, { error: 'Phòng ban đã ngưng hoạt động hoặc không tồn tại.' })

    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: APP_URL,
      data: { full_name: fullName, needs_password_setup: true },
    })
    if (inviteError || !invited.user) {
      const duplicate = inviteError?.message.toLowerCase().includes('already')
      return json(req, duplicate ? 409 : 400, { error: duplicate ? 'Email này đã có tài khoản.' : 'Không thể gửi email mời. Vui lòng kiểm tra cấu hình email Auth.' })
    }

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .update({ full_name: fullName, department_id: departmentId, role, is_active: true })
      .eq('user_id', invited.user.id)
      .select('user_id, full_name, department_id, role, is_active, departments(name)')
      .single()
    if (profileError) {
      await admin.auth.admin.deleteUser(invited.user.id)
      return json(req, 500, { error: 'Đã hủy lời mời vì không thể lưu phân quyền.' })
    }
    return json(req, 200, { data: presentAccount(invited.user, profile) })
  }

  if (body.action === 'update') {
    const userId = String(body.payload?.userId || '')
    const fullName = String(body.payload?.fullName || '').trim()
    const departmentId = Number(body.payload?.departmentId)
    const role = body.payload?.role as AppRole
    const active = body.payload?.active === true
    if (!/^[0-9a-f-]{36}$/i.test(userId)) return json(req, 400, { error: 'Tài khoản không hợp lệ.' })
    if (fullName.length < 2 || fullName.length > 120) return json(req, 400, { error: 'Họ tên cần từ 2 đến 120 ký tự.' })
    if (!Number.isInteger(departmentId) || departmentId <= 0) return json(req, 400, { error: 'Phòng ban không hợp lệ.' })
    if (!allowedRoles.includes(role)) return json(req, 400, { error: 'Vai trò không hợp lệ.' })

    const { data: target } = await admin.from('profiles').select('user_id, role, is_active').eq('user_id', userId).maybeSingle()
    if (!target) return json(req, 404, { error: 'Không tìm thấy tài khoản.' })
    if (userId === authData.user.id && (!active || role !== 'finance_admin')) return json(req, 400, { error: 'Bạn không thể tự khóa hoặc tự hạ quyền Finance Admin của mình.' })
    if (target.role === 'finance_admin' && target.is_active && (!active || role !== 'finance_admin')) {
      const { count } = await admin.from('profiles').select('user_id', { count: 'exact', head: true }).eq('role', 'finance_admin').eq('is_active', true)
      if ((count || 0) <= 1) return json(req, 400, { error: 'Hệ thống phải luôn còn ít nhất một Finance Admin hoạt động.' })
    }

    const [{ data: department }, { data: authUser, error: getUserError }] = await Promise.all([
      admin.from('departments').select('id').eq('id', departmentId).eq('is_active', true).maybeSingle().then((result) => result),
      admin.auth.admin.getUserById(userId),
    ])
    if (!department) return json(req, 400, { error: 'Phòng ban đã ngưng hoạt động hoặc không tồn tại.' })
    if (getUserError || !authUser.user) return json(req, 404, { error: 'Không tìm thấy tài khoản Auth.' })

    const { data: profile, error: updateError } = await admin
      .from('profiles')
      .update({ full_name: fullName, department_id: departmentId, role, is_active: active })
      .eq('user_id', userId)
      .select('user_id, full_name, department_id, role, is_active, departments(name)')
      .single()
    if (updateError) return json(req, 500, { error: 'Không thể cập nhật phân quyền.' })
    return json(req, 200, { data: presentAccount(authUser.user, profile) })
  }

  return json(req, 400, { error: 'Thao tác quản trị không được hỗ trợ.' })
})
