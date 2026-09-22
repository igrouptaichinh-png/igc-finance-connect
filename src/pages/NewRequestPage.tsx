import { useMemo, useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, CalendarDays, Check, FileCheck2, Info, Paperclip, Send } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { departments, requestTypes } from '../data/demo'
import type { RequestCategory, RequestPriority } from '../domain/types'
import { useRequests } from '../features/requests/RequestContext'

const categoryIcons: Record<RequestCategory, string> = {
  'Thanh toán': '₫', 'Tạm ứng & hoàn ứng': '⇄', 'Ngân sách': '◔',
  'Hóa đơn & chứng từ': '≡', 'Mã dữ liệu tài chính': '#', 'Báo cáo & đối soát': '∿', 'Tư vấn chính sách': '?',
}

export function NewRequestPage() {
  const navigate = useNavigate()
  const { createRequest } = useRequests()
  const [step, setStep] = useState(1)
  const [category, setCategory] = useState<RequestCategory>('Thanh toán')
  const [requestType, setRequestType] = useState(requestTypes[0].name)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [expectedBenefit, setExpectedBenefit] = useState('')
  const [visibility, setVisibility] = useState<'Công khai nội bộ' | 'Chỉ phòng ban' | 'Chỉ Phòng Tài chính'>('Công khai nội bộ')
  const [department, setDepartment] = useState(departments[1])
  const [priority, setPriority] = useState<RequestPriority>('Thường')
  const [amount, setAmount] = useState('')
  const [dueAt, setDueAt] = useState('2026-09-24')
  const availableTypes = useMemo(() => requestTypes.filter((item) => item.category === category), [category])
  const selectedType = requestTypes.find((item) => item.name === requestType) || availableTypes[0]

  const chooseCategory = (value: RequestCategory) => {
    setCategory(value)
    setRequestType(requestTypes.find((item) => item.category === value)?.name || '')
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (step < 3) { setStep(step + 1); return }
    const request = createRequest({
      title, description, category, requestType, department, priority,
      amount: amount ? Number(amount.replace(/\D/g, '')) : undefined,
      currency: 'VND', dueAt: `${dueAt}T17:00:00+07:00`, expectedBenefit, visibility,
    })
    navigate(`/my-requests?created=${request.id}`)
  }

  return (
    <>
      <section className="page-heading compact-heading"><div><p>Chia sẻ ý kiến</p><h1>Đóng góp cùng Phòng Tài chính</h1><span>Chia sẻ trải nghiệm, điểm chưa thuận tiện hoặc một ý tưởng có thể giúp công việc tốt hơn.</span></div></section>
      <div className="wizard-layout">
        <form className="request-form content-card" onSubmit={submit}>
          <div className="stepper">
            {['Chọn chủ đề', 'Chia sẻ nội dung', 'Kiểm tra & gửi'].map((label, index) => <div key={label} className={`${step === index + 1 ? 'active' : ''} ${step > index + 1 ? 'done' : ''}`}><i>{step > index + 1 ? <Check size={14} /> : index + 1}</i><span>{label}</span></div>)}
          </div>

          {step === 1 && <div className="form-step">
            <div className="form-step-head"><h2>Bạn muốn chia sẻ về chủ đề nào?</h2><p>Chọn nội dung gần nhất để ý kiến đến đúng người phụ trách.</p></div>
            <div className="category-grid">{requestTypes.map((item) => <button type="button" key={item.category} onClick={() => chooseCategory(item.category)} className={category === item.category ? 'selected' : ''}><i>{categoryIcons[item.category]}</i><span><strong>{item.category}</strong><small>{item.description}</small></span>{category === item.category && <Check className="category-check" size={16} />}</button>)}</div>
            <label className="field full-field"><span>Nội dung cụ thể</span><select value={requestType} onChange={(event) => setRequestType(event.target.value)}>{availableTypes.map((item) => <option key={item.name}>{item.name}</option>)}</select><small><Info size={13} />Phản hồi dự kiến trong {selectedType.slaHours} giờ làm việc{selectedType.requiresApproval && ' · Có thể cần thêm bước đánh giá'}</small></label>
          </div>}

          {step === 2 && <div className="form-step">
            <div className="form-step-head"><h2>Nội dung đóng góp</h2><p>Chia sẻ tình huống thực tế và điều bạn mong muốn được cải thiện.</p></div>
            <div className="form-grid">
              <label className="field full-field"><span>Tiêu đề ý kiến <b>*</b></span><input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ví dụ: Đề xuất đơn giản hóa bước đối chiếu chứng từ" /></label>
              <label className="field full-field"><span>Bối cảnh hoặc điểm chưa thuận tiện <b>*</b></span><textarea required rows={4} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Điều gì đang xảy ra, ai bị ảnh hưởng và vì sao bạn muốn chia sẻ ý kiến này?" /><small>{description.length}/1.500 ký tự</small></label>
              <label className="field full-field"><span>Đề xuất và lợi ích kỳ vọng</span><textarea rows={3} value={expectedBenefit} onChange={(event) => setExpectedBenefit(event.target.value)} placeholder="Bạn mong muốn thay đổi điều gì và thay đổi đó sẽ giúp ích như thế nào?" /></label>
              <label className="field"><span>Phòng ban</span><select value={department} onChange={(event) => setDepartment(event.target.value)}>{departments.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className="field"><span>Mức độ ảnh hưởng</span><select value={priority} onChange={(event) => setPriority(event.target.value as RequestPriority)}><option value="Thường">Thông thường</option><option value="Ưu tiên">Ảnh hưởng đáng kể</option><option value="Khẩn">Cần lưu ý sớm</option></select></label>
              <label className="field"><span>Phạm vi chia sẻ</span><select value={visibility} onChange={(event) => setVisibility(event.target.value as typeof visibility)}><option>Công khai nội bộ</option><option>Chỉ phòng ban</option><option>Chỉ Phòng Tài chính</option></select></label>
              <label className="field"><span>Giá trị liên quan (nếu có)</span><div className="input-suffix"><input inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0" /><span>VND</span></div></label>
              <label className="field"><span>Thời điểm mong muốn phản hồi</span><div className="input-icon"><CalendarDays size={16} /><input type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /></div></label>
              <label className="upload-zone full-field"><input type="file" multiple /><Paperclip size={21} /><strong>Kéo thả hoặc chọn tài liệu minh họa</strong><span>PDF, Excel, Word, hình ảnh · Tối đa 10 MB/tệp</span></label>
            </div>
          </div>}

          {step === 3 && <div className="form-step review-step">
            <div className="review-hero"><FileCheck2 size={30} /><div><h2>Kiểm tra trước khi chia sẻ</h2><p>Ý kiến sẽ được gửi đến Phòng Tài chính và hiển thị theo phạm vi bạn chọn.</p></div></div>
            <div className="review-grid"><div><span>Chủ đề</span><strong>{category}</strong></div><div><span>Nội dung</span><strong>{requestType}</strong></div><div><span>Tiêu đề</span><strong>{title || 'Chưa nhập tiêu đề'}</strong></div><div><span>Phòng ban</span><strong>{department}</strong></div><div><span>Mức độ ảnh hưởng</span><strong>{priority}</strong></div><div><span>Phạm vi</span><strong>{visibility}</strong></div></div>
            <div className="review-description"><span>Mô tả</span><p>{description || 'Chưa có nội dung mô tả.'}</p></div>
            <label className="confirm-check"><input required type="checkbox" /><span>Tôi xác nhận nội dung chia sẻ mang tính xây dựng và thông tin đã cung cấp là phù hợp.</span></label>
          </div>}

          <footer className="form-actions"><button type="button" className="button button-secondary" onClick={() => step === 1 ? navigate('/') : setStep(step - 1)}><ArrowLeft size={16} />{step === 1 ? 'Hủy' : 'Quay lại'}</button><button className="button button-primary" disabled={step === 2 && (!title || !description)}>{step < 3 ? <>Tiếp tục<ArrowRight size={16} /></> : <>Chia sẻ ý kiến<Send size={16} /></>}</button></footer>
        </form>
        <aside className="wizard-help"><div className="help-card"><span>Hành trình trao đổi</span><h3>{selectedType.name}</h3><ol><li className="active">Ghi nhận ý kiến</li><li>Trao đổi và làm rõ</li>{selectedType.requiresApproval && <li>Đánh giá đề xuất</li>}<li>Phản hồi kết quả</li></ol><div className="sla-box"><strong>{selectedType.slaHours} giờ</strong><span>Thời gian phản hồi dự kiến</span></div></div><div className="tip-card"><Info size={17} /><p><strong>Gợi ý chia sẻ:</strong> Mô tả tình huống thực tế và lợi ích bạn kỳ vọng để Phòng Tài chính dễ trao đổi hơn.</p></div></aside>
      </div>
    </>
  )
}
