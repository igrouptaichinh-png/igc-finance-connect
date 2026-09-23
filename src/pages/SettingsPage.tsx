import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { BellRing, CheckCircle2, ChevronRight, Clock3, Database, GitBranch, LockKeyhole, Minus, Plus, RotateCcw, Save, SlidersHorizontal, UsersRound, X } from 'lucide-react'
import type { RequestCategory } from '../domain/types'
import { useRequests } from '../features/requests/RequestContext'
import { createContributionTopic, listContributionTopics, setContributionTopicActive, updateContributionTopic, type ContributionTopic, type TopicInput } from '../features/settings/api'
import { GroupsSettings } from '../features/settings/GroupsSettings'
import { NotificationsSettings } from '../features/settings/NotificationsSettings'
import { isSupabaseConfigured } from '../lib/supabase'

type SettingsSection = 'topics' | 'workflow' | 'groups' | 'notifications'

const categories: RequestCategory[] = ['Thanh toán', 'Tạm ứng & hoàn ứng', 'Ngân sách', 'Hóa đơn & chứng từ', 'Mã dữ liệu tài chính', 'Báo cáo & đối soát', 'Tư vấn chính sách']

const emptyTopic: TopicInput = {
  code: '', category: 'Thanh toán', name: '', description: '', responseHours: 24,
  requiresReview: false, active: true,
  workflowSteps: ['Ghi nhận ý kiến', 'Trao đổi và làm rõ', 'Phản hồi kết quả'],
}

function validateTopic(input: TopicInput) {
  if (!/^[A-Z0-9_-]{2,40}$/.test(input.code.trim().toUpperCase())) return 'Mã cần từ 2 đến 40 ký tự và chỉ gồm chữ in hoa, số, dấu gạch ngang hoặc gạch dưới.'
  if (input.name.trim().length < 3 || input.name.trim().length > 160) return 'Tên chủ đề cần từ 3 đến 160 ký tự.'
  if (input.description.trim().length > 5000) return 'Mô tả không được vượt quá 5.000 ký tự.'
  if (input.responseHours < 1 || input.responseHours > 720) return 'Thời gian phản hồi cần từ 1 đến 720 giờ.'
  const steps = input.workflowSteps.map((step) => step.trim()).filter(Boolean)
  if (steps.length < 2 || steps.length > 8) return 'Quy trình cần từ 2 đến 8 bước có nội dung.'
  if (steps.some((step) => step.length > 120)) return 'Tên mỗi bước không được vượt quá 120 ký tự.'
  return null
}

export function SettingsPage() {
  const { refresh: refreshRequests } = useRequests()
  const [section, setSection] = useState<SettingsSection>('topics')
  const [topics, setTopics] = useState<ContributionTopic[]>([])
  const [editing, setEditing] = useState<ContributionTopic | null>(null)
  const [draft, setDraft] = useState<TopicInput>(emptyTopic)
  const [isNew, setIsNew] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  const loadTopics = useCallback(async () => {
    setLoading(true)
    try {
      setTopics(await listContributionTopics())
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Không thể tải thiết lập.' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- remote configuration loads after the authenticated route mounts
    void loadTopics()
  }, [loadTopics])
  const activeCount = useMemo(() => topics.filter((topic) => topic.active).length, [topics])

  const openEditor = (topic: ContributionTopic) => {
    setEditing(topic)
    setIsNew(false)
    setDraft({ ...topic, workflowSteps: [...topic.workflowSteps] })
    setNotice(null)
  }

  const openNewTopic = () => {
    setEditing(null)
    setIsNew(true)
    setDraft({ ...emptyTopic, workflowSteps: [...emptyTopic.workflowSteps] })
    setNotice(null)
  }

  const closeEditor = () => {
    setEditing(null)
    setIsNew(false)
  }

  const save = async (event: FormEvent) => {
    event.preventDefault()
    const validationError = validateTopic(draft)
    if (validationError) {
      setNotice({ tone: 'error', text: validationError })
      return
    }
    setSaving(true)
    setNotice(null)
    try {
      const normalized = { ...draft, code: draft.code.trim().toUpperCase(), workflowSteps: draft.workflowSteps.map((step) => step.trim()).filter(Boolean) }
      if (isNew) await createContributionTopic(normalized)
      else if (editing) await updateContributionTopic(editing.id, normalized)
      await Promise.all([loadTopics(), refreshRequests()])
      setNotice({ tone: 'success', text: isNew ? 'Đã thêm chủ đề mới.' : section === 'workflow' ? 'Đã cập nhật quy trình phản hồi.' : 'Đã cập nhật nội dung chủ đề.' })
      closeEditor()
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Không thể lưu thiết lập.' })
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (topic: ContributionTopic, active: boolean) => {
    setSaving(true)
    setNotice(null)
    try {
      await setContributionTopicActive(topic, active)
      await Promise.all([loadTopics(), refreshRequests()])
      setNotice({ tone: 'success', text: active ? 'Đã kích hoạt chủ đề.' : 'Đã tạm ẩn chủ đề khỏi biểu mẫu chia sẻ.' })
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Không thể thay đổi trạng thái chủ đề.' })
    } finally {
      setSaving(false)
    }
  }

  const setWorkflowStep = (index: number, value: string) => {
    setDraft((current) => ({ ...current, workflowSteps: current.workflowSteps.map((step, stepIndex) => stepIndex === index ? value : step) }))
  }

  const removeWorkflowStep = (index: number) => {
    setDraft((current) => ({ ...current, workflowSteps: current.workflowSteps.filter((_, stepIndex) => stepIndex !== index) }))
  }

  const selectSection = (next: SettingsSection) => {
    setSection(next)
    closeEditor()
    setNotice(null)
  }

  return (
    <>
      <section className="page-heading">
        <div><p>Quản trị hệ thống</p><h1>Thiết lập Finance Connect</h1><span>Cập nhật chủ đề, quy trình, nhóm xử lý và phân quyền ngay trên ứng dụng.</span></div>
        {section === 'topics' && <button type="button" className="button button-primary" onClick={openNewTopic}><Plus size={16} />Thêm chủ đề</button>}
      </section>

      {notice && <div className={`account-notice ${notice.tone === 'error' ? 'error' : ''}`} role="status">{notice.tone === 'success' && <CheckCircle2 size={16} />}{notice.text}<button type="button" onClick={() => setNotice(null)}><X size={14} /></button></div>}

      <section className="settings-layout">
        <aside className="settings-nav content-card">
          <button type="button" className={section === 'topics' ? 'active' : ''} onClick={() => selectSection('topics')}><SlidersHorizontal size={18} /><span><strong>Chủ đề đóng góp</strong><small>Nội dung hiển thị trên biểu mẫu</small></span><ChevronRight size={15} /></button>
          <button type="button" className={section === 'workflow' ? 'active' : ''} onClick={() => selectSection('workflow')}><GitBranch size={18} /><span><strong>Quy trình phản hồi</strong><small>Các bước, SLA và đánh giá</small></span><ChevronRight size={15} /></button>
          <button type="button" className={section === 'groups' ? 'active' : ''} onClick={() => selectSection('groups')}><UsersRound size={18} /><span><strong>Nhóm & phân quyền</strong><small>Nhóm, thành viên và phân công</small></span><ChevronRight size={15} /></button>
          <button type="button" className={section === 'notifications' ? 'active' : ''} onClick={() => selectSection('notifications')}><BellRing size={18} /><span><strong>Thông báo</strong><small>Sự kiện và người nhận</small></span><ChevronRight size={15} /></button>
          {[[Database, 'Kết nối dữ liệu', 'Supabase đang hoạt động'], [LockKeyhole, 'Bảo mật & nhật ký', 'RLS và audit trail']].map(([Icon, title, text]) => { const Component = Icon as typeof UsersRound; return <button type="button" className="settings-nav-disabled" disabled key={String(title)}><Component size={18} /><span><strong>{String(title)}</strong><small>{String(text)}</small></span><ChevronRight size={15} /></button> })}
        </aside>

        <div className="settings-main content-card">
          {section === 'groups' ? <GroupsSettings /> : section === 'notifications' ? <NotificationsSettings /> : <>
          <header className="card-head">
            <div><h2>{section === 'topics' ? 'Chủ đề đóng góp' : 'Quy trình phản hồi'}</h2><p>{section === 'topics' ? 'Chỉnh tên, mô tả và nhóm nội dung mà nhân viên nhìn thấy.' : 'Thiết lập các bước xử lý, thời gian phản hồi và yêu cầu đánh giá.'}</p></div>
            <span>{activeCount}/{topics.length} chủ đề đang hoạt động</span>
          </header>

          {loading ? <div className="settings-empty">Đang tải thiết lập từ Supabase...</div> : topics.length === 0 ? <div className="settings-empty">Chưa có chủ đề nào. Hãy thêm chủ đề đầu tiên.</div> : (
            <div className={`request-type-list ${section === 'workflow' ? 'workflow-list' : ''}`}>
              {topics.map((item, index) => <article className={!item.active ? 'inactive' : ''} key={item.id}>
                <div className="type-order">{String(index + 1).padStart(2, '0')}</div>
                <div><span>{section === 'topics' ? item.category : item.code}</span><strong>{item.name}</strong><p>{section === 'topics' ? item.description : item.workflowSteps.join(' → ')}</p></div>
                <div className="type-rules"><span><Clock3 size={14} />{item.responseHours} giờ</span>{item.requiresReview && <span className="approval-rule">Cần đánh giá</span>}</div>
                {section === 'topics' ? <label className="switch" title={item.active ? 'Tạm ẩn chủ đề' : 'Kích hoạt chủ đề'}><input type="checkbox" checked={item.active} disabled={saving} onChange={(event) => void toggleActive(item, event.target.checked)} /><i /></label> : <span className={`topic-state ${item.active ? 'active' : ''}`}>{item.active ? 'Đang dùng' : 'Tạm ẩn'}</span>}
                <button type="button" className="icon-button" aria-label={`Chỉnh sửa ${item.name}`} onClick={() => openEditor(item)}><ChevronRight size={17} /></button>
              </article>)}
            </div>
          )}

          {(editing || isNew) && <form className="settings-editor" onSubmit={save}>
            <header><div><span>{isNew ? 'CHỦ ĐỀ MỚI' : editing?.code}</span><h3>{isNew ? 'Thêm chủ đề đóng góp' : section === 'workflow' ? `Chỉnh quy trình: ${editing?.name}` : `Chỉnh nội dung: ${editing?.name}`}</h3></div><button type="button" className="icon-button" onClick={closeEditor} aria-label="Đóng"><X size={16} /></button></header>

            {section === 'topics' && <div className="settings-form-grid">
              <label className="field"><span>Mã chủ đề <b>*</b></span><input required minLength={2} maxLength={40} value={draft.code} onChange={(event) => setDraft({ ...draft, code: event.target.value.toUpperCase() })} placeholder="VD: PAYMENT_FEEDBACK" /></label>
              <label className="field"><span>Nhóm nội dung <b>*</b></span><select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value as RequestCategory })}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
              <label className="field full-field"><span>Tên hiển thị <b>*</b></span><input required minLength={3} maxLength={160} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Tên mà người đóng góp sẽ nhìn thấy" /></label>
              <label className="field full-field"><span>Mô tả ngắn</span><textarea rows={3} maxLength={5000} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Giúp người dùng biết khi nào nên chọn chủ đề này" /><small>{draft.description.length}/5.000 ký tự</small></label>
              <label className="field"><span>Phản hồi dự kiến (giờ) <b>*</b></span><input type="number" min={1} max={720} value={draft.responseHours} onChange={(event) => setDraft({ ...draft, responseHours: Number(event.target.value) })} /></label>
              <label className="settings-check"><input type="checkbox" checked={draft.requiresReview} onChange={(event) => setDraft({ ...draft, requiresReview: event.target.checked })} /><span><strong>Cần bước đánh giá</strong><small>Đưa ý kiến qua người đánh giá trước khi phản hồi</small></span></label>
            </div>}

            {section === 'workflow' && <div className="workflow-editor">
              <div className="settings-form-grid">
                <label className="field"><span>Thời gian phản hồi dự kiến (giờ)</span><input type="number" min={1} max={720} value={draft.responseHours} onChange={(event) => setDraft({ ...draft, responseHours: Number(event.target.value) })} /></label>
                <label className="settings-check"><input type="checkbox" checked={draft.requiresReview} onChange={(event) => setDraft({ ...draft, requiresReview: event.target.checked })} /><span><strong>Cần bước đánh giá</strong><small>Bật khi ý kiến cần người có thẩm quyền xem xét</small></span></label>
              </div>
              <div className="workflow-step-head"><div><strong>Các bước hiển thị cho người đóng góp</strong><span>Kéo dài từ 2 đến 8 bước, theo đúng thứ tự xử lý.</span></div><button type="button" className="button button-secondary" disabled={draft.workflowSteps.length >= 8} onClick={() => setDraft({ ...draft, workflowSteps: [...draft.workflowSteps, 'Bước mới'] })}><Plus size={14} />Thêm bước</button></div>
              <div className="workflow-steps">{draft.workflowSteps.map((step, index) => <div key={index}><i>{index + 1}</i><input maxLength={120} value={step} onChange={(event) => setWorkflowStep(index, event.target.value)} aria-label={`Bước ${index + 1}`} /><button type="button" className="icon-button" disabled={draft.workflowSteps.length <= 2} onClick={() => removeWorkflowStep(index)} aria-label={`Xóa bước ${index + 1}`}><Minus size={15} /></button></div>)}</div>
            </div>}

            <footer><button type="button" className="button button-secondary" onClick={closeEditor}>Hủy</button><button className="button button-primary" disabled={saving}><Save size={15} />{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button></footer>
          </form>}
          </>}
        </div>
      </section>

      <section className="environment-card content-card"><div className={`environment-icon ${isSupabaseConfigured ? 'ready' : ''}`}><Database size={22} /></div><div><span>Môi trường dữ liệu</span><h3>{isSupabaseConfigured ? 'Đang sử dụng dữ liệu thật trên Supabase' : 'Chưa kết nối Supabase'}</h3><p>{isSupabaseConfigured ? 'Mọi thay đổi tại trang này được lưu trực tiếp và chỉ Finance Admin có quyền thực hiện.' : 'Thêm VITE_SUPABASE_URL và VITE_SUPABASE_PUBLISHABLE_KEY để vận hành ứng dụng.'}</p></div><button className="button button-secondary" disabled={loading} onClick={() => void loadTopics()}><RotateCcw size={15} />Làm mới dữ liệu</button></section>
    </>
  )
}
