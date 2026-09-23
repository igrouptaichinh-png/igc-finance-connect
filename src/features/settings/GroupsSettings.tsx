import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { CheckCircle2, ChevronRight, Plus, Save, ShieldCheck, UserRoundCog, UsersRound, X } from 'lucide-react'
import { loadFinanceGroupDirectory, saveFinanceGroup, type FinanceGroup, type FinanceGroupDirectory, type FinanceGroupInput, type FinanceGroupRole } from './groupApi'

const emptyGroup: FinanceGroupInput = { id: null, code: '', name: '', description: '', active: true, members: [], topics: [] }

function validateGroup(group: FinanceGroupInput) {
  if (!/^[A-Z0-9_-]{2,30}$/.test(group.code.trim().toUpperCase())) return 'Mã nhóm cần từ 2 đến 30 ký tự và chỉ gồm chữ in hoa, số, dấu gạch ngang hoặc gạch dưới.'
  if (group.name.trim().length < 3 || group.name.trim().length > 120) return 'Tên nhóm cần từ 3 đến 120 ký tự.'
  if (group.description.trim().length > 1000) return 'Mô tả nhóm không được vượt quá 1.000 ký tự.'
  if (group.active && group.members.length === 0) return 'Nhóm đang hoạt động cần có ít nhất một thành viên.'
  const memberIds = new Set(group.members.map((member) => member.userId))
  if (group.topics.some((topic) => !topic.primaryAssigneeId || !memberIds.has(topic.primaryAssigneeId))) return 'Mỗi chủ đề cần một người phụ trách chính thuộc nhóm.'
  if (group.topics.some((topic) => topic.backupAssigneeId && (!memberIds.has(topic.backupAssigneeId) || topic.backupAssigneeId === topic.primaryAssigneeId))) return 'Người thay thế phải thuộc nhóm và khác người phụ trách chính.'
  return null
}

export function GroupsSettings() {
  const [directory, setDirectory] = useState<FinanceGroupDirectory>({ groups: [], users: [], topics: [] })
  const [draft, setDraft] = useState<FinanceGroupInput | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { setDirectory(await loadFinanceGroupDirectory()) }
    catch (error) { setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Không thể tải danh sách nhóm.' }) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- remote settings load after the admin section mounts
    void load()
  }, [load])

  const assignedGroupByTopic = useMemo(() => new Map(directory.groups.flatMap((group) => group.topics.map((topic) => [topic.topicId, group] as const))), [directory.groups])
  const selectedUsers = useMemo(() => directory.users.filter((user) => draft?.members.some((member) => member.userId === user.id)), [directory.users, draft?.members])

  const editGroup = (group: FinanceGroup) => setDraft({ ...group, members: group.members.map((member) => ({ ...member })), topics: group.topics.map((topic) => ({ ...topic })) })

  const toggleMember = (userId: string, selected: boolean) => {
    if (!draft) return
    if (selected) setDraft({ ...draft, members: [...draft.members, { userId, groupRole: 'member' }] })
    else setDraft({
      ...draft,
      members: draft.members.filter((member) => member.userId !== userId),
      topics: draft.topics.map((topic) => ({ ...topic, primaryAssigneeId: topic.primaryAssigneeId === userId ? '' : topic.primaryAssigneeId, backupAssigneeId: topic.backupAssigneeId === userId ? null : topic.backupAssigneeId })),
    })
  }

  const setMemberRole = (userId: string, groupRole: FinanceGroupRole) => {
    if (!draft) return
    setDraft({ ...draft, members: draft.members.map((member) => member.userId === userId ? { ...member, groupRole } : member) })
  }

  const toggleTopic = (topicId: number, selected: boolean) => {
    if (!draft) return
    if (selected) setDraft({ ...draft, topics: [...draft.topics, { topicId, primaryAssigneeId: selectedUsers[0]?.id || '', backupAssigneeId: null }] })
    else setDraft({ ...draft, topics: draft.topics.filter((topic) => topic.topicId !== topicId) })
  }

  const updateTopicAssignment = (topicId: number, field: 'primaryAssigneeId' | 'backupAssigneeId', value: string) => {
    if (!draft) return
    setDraft({ ...draft, topics: draft.topics.map((topic) => topic.topicId === topicId ? { ...topic, [field]: value || null } : topic) })
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!draft) return
    const validationError = validateGroup(draft)
    if (validationError) { setNotice({ tone: 'error', text: validationError }); return }
    setSaving(true)
    setNotice(null)
    try {
      await saveFinanceGroup(draft)
      await load()
      setDraft(null)
      setNotice({ tone: 'success', text: draft.id ? 'Đã cập nhật nhóm và phân công.' : 'Đã tạo nhóm xử lý mới.' })
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Không thể lưu nhóm xử lý.' })
    } finally { setSaving(false) }
  }

  return (
    <>
      <header className="card-head group-settings-head"><div><h2>Nhóm & phân quyền</h2><p>Tổ chức nhóm xử lý, thành viên và người phụ trách theo từng chủ đề.</p></div><button type="button" className="button button-primary" onClick={() => { setDraft({ ...emptyGroup, members: [], topics: [] }); setNotice(null) }}><Plus size={15} />Thêm nhóm</button></header>
      {notice && <div className={`account-notice settings-inline-notice ${notice.tone === 'error' ? 'error' : ''}`} role="status">{notice.tone === 'success' && <CheckCircle2 size={15} />}{notice.text}<button type="button" onClick={() => setNotice(null)}><X size={13} /></button></div>}

      {loading ? <div className="settings-empty">Đang tải nhóm và tài khoản từ Supabase...</div> : directory.groups.length === 0 ? <div className="settings-empty">Chưa có nhóm xử lý. Chọn “Thêm nhóm” để bắt đầu.</div> : <div className="group-admin-list">{directory.groups.map((group) => {
        const leads = group.members.filter((member) => member.groupRole === 'lead').map((member) => directory.users.find((user) => user.id === member.userId)?.fullName).filter(Boolean)
        return <article className={!group.active ? 'inactive' : ''} key={group.id}><div className="group-admin-icon"><UsersRound size={18} /></div><div><span>{group.code}</span><strong>{group.name}</strong><p>{group.description || 'Chưa có mô tả.'}</p></div><div className="group-admin-stats"><span><b>{group.members.length}</b> thành viên</span><span><b>{group.topics.length}</b> chủ đề</span><small>{leads.length ? `Trưởng nhóm: ${leads.join(', ')}` : 'Chưa chọn trưởng nhóm'}</small></div><span className={`topic-state ${group.active ? 'active' : ''}`}>{group.active ? 'Hoạt động' : 'Tạm ngưng'}</span><button type="button" className="icon-button" aria-label={`Chỉnh sửa nhóm ${group.name}`} onClick={() => editGroup(group)}><ChevronRight size={17} /></button></article>
      })}</div>}

      {draft && <form className="settings-editor group-editor" onSubmit={submit}>
        <header><div><span>{draft.id ? draft.code : 'NHÓM MỚI'}</span><h3>{draft.id ? `Chỉnh sửa ${draft.name}` : 'Tạo nhóm xử lý'}</h3></div><button type="button" className="icon-button" onClick={() => setDraft(null)} aria-label="Đóng"><X size={16} /></button></header>
        <div className="settings-form-grid">
          <label className="field"><span>Mã nhóm <b>*</b></span><input required minLength={2} maxLength={30} value={draft.code} onChange={(event) => setDraft({ ...draft, code: event.target.value.toUpperCase() })} placeholder="VD: PAYMENT_TEAM" /></label>
          <label className="field"><span>Tên nhóm <b>*</b></span><input required minLength={3} maxLength={120} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="VD: Nhóm Thanh toán" /></label>
          <label className="field full-field"><span>Mô tả trách nhiệm</span><textarea rows={2} maxLength={1000} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Phạm vi công việc mà nhóm phụ trách" /></label>
          <label className="settings-check full-field"><input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} /><span><strong>Nhóm đang hoạt động</strong><small>Nhóm có thể nhận chủ đề và xử lý ý kiến mới</small></span></label>
        </div>

        <section className="group-config-section"><header><div><UserRoundCog size={17} /><span><strong>Thành viên nhóm</strong><small>Chỉ hiển thị tài khoản thuộc vai trò Tài chính.</small></span></div><b>{draft.members.length} người</b></header><div className="group-member-list">{directory.users.map((user) => {
          const membership = draft.members.find((member) => member.userId === user.id)
          return <article key={user.id}><label><input type="checkbox" checked={Boolean(membership)} onChange={(event) => toggleMember(user.id, event.target.checked)} /><span><strong>{user.fullName}</strong><small>{user.department} · {user.roleLabel}</small></span></label><select disabled={!membership} value={membership?.groupRole || 'member'} onChange={(event) => setMemberRole(user.id, event.target.value as FinanceGroupRole)}><option value="member">Thành viên</option><option value="lead">Trưởng nhóm</option></select></article>
        })}</div></section>

        <section className="group-config-section"><header><div><ShieldCheck size={17} /><span><strong>Chủ đề và người phụ trách</strong><small>Mỗi chủ đề chỉ thuộc một nhóm; người thay thế là tùy chọn.</small></span></div><b>{draft.topics.length} chủ đề</b></header><div className="group-topic-list">{directory.topics.map((topic) => {
          const assignment = draft.topics.find((item) => item.topicId === topic.id)
          const assignedGroup = assignedGroupByTopic.get(topic.id)
          const ownedElsewhere = Boolean(assignedGroup && assignedGroup.id !== draft.id)
          return <article className={ownedElsewhere ? 'locked' : ''} key={topic.id}><label><input type="checkbox" checked={Boolean(assignment)} disabled={ownedElsewhere || selectedUsers.length === 0} onChange={(event) => toggleTopic(topic.id, event.target.checked)} /><span><strong>{topic.name}</strong><small>{ownedElsewhere ? `Đang thuộc ${assignedGroup?.name}` : topic.category}</small></span></label>{assignment && <div><select aria-label={`Người phụ trách ${topic.name}`} value={assignment.primaryAssigneeId} onChange={(event) => updateTopicAssignment(topic.id, 'primaryAssigneeId', event.target.value)}><option value="">Chọn người phụ trách</option>{selectedUsers.map((user) => <option value={user.id} key={user.id}>{user.fullName}</option>)}</select><select aria-label={`Người thay thế ${topic.name}`} value={assignment.backupAssigneeId || ''} onChange={(event) => updateTopicAssignment(topic.id, 'backupAssigneeId', event.target.value)}><option value="">Không có người thay thế</option>{selectedUsers.filter((user) => user.id !== assignment.primaryAssigneeId).map((user) => <option value={user.id} key={user.id}>{user.fullName}</option>)}</select></div>}</article>
        })}</div></section>

        <footer><button type="button" className="button button-secondary" onClick={() => setDraft(null)}>Hủy</button><button className="button button-primary" disabled={saving}><Save size={15} />{saving ? 'Đang lưu...' : 'Lưu nhóm & phân công'}</button></footer>
      </form>}

      <section className="permission-matrix"><header><h3>Ma trận quyền hệ thống</h3><p>Quyền nền tảng theo vai trò; việc thuộc nhóm quyết định chủ đề được phân công.</p></header><div className="permission-table"><div className="permission-row permission-head"><span>Vai trò</span><span>Chia sẻ</span><span>Xử lý</span><span>Đánh giá</span><span>Quản trị</span></div>{[
        ['Người đóng góp', '✓', '—', '—', '—'], ['Người phụ trách', '—', '✓', '—', '—'], ['Người đánh giá', '—', 'Xem', '✓', '—'], ['Finance Admin', '✓', '✓', '✓', '✓'],
      ].map((row) => <div className="permission-row" key={row[0]}>{row.map((cell, index) => <span className={cell === '✓' ? 'allowed' : ''} key={`${cell}-${index}`}>{cell}</span>)}</div>)}</div></section>
    </>
  )
}
