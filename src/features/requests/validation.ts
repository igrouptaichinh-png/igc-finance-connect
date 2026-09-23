import type { CreateRequestInput } from '../../domain/types'

export function validateContribution(input: Pick<CreateRequestInput, 'title' | 'description' | 'expectedBenefit'>) {
  const titleLength = input.title.trim().length
  const descriptionLength = input.description.trim().length
  const benefitLength = input.expectedBenefit?.trim().length || 0

  if (titleLength < 5) return 'Tiêu đề cần có ít nhất 5 ký tự.'
  if (titleLength > 180) return 'Tiêu đề không được vượt quá 180 ký tự.'
  if (descriptionLength < 10) return 'Nội dung mô tả cần có ít nhất 10 ký tự.'
  if (descriptionLength > 5000) return 'Nội dung mô tả không được vượt quá 5.000 ký tự.'
  if (benefitLength > 3000) return 'Đề xuất và lợi ích kỳ vọng không được vượt quá 3.000 ký tự.'
  return null
}

export function friendlyContributionError(message: string) {
  const normalized = message.toLowerCase()
  if (normalized.includes('contributions_title_check')) return 'Tiêu đề cần có từ 5 đến 180 ký tự.'
  if (normalized.includes('contributions_description_check')) return 'Nội dung mô tả cần có từ 10 đến 5.000 ký tự.'
  if (normalized.includes('contributions_expected_benefit_check')) return 'Đề xuất và lợi ích kỳ vọng không được vượt quá 3.000 ký tự.'
  if (normalized.includes('contributions_code_key')) return 'Mã ý kiến vừa bị trùng. Vui lòng gửi lại một lần nữa.'
  if (normalized.includes('row-level security') || normalized.includes('permission denied')) return 'Tài khoản hiện tại chưa có quyền chia sẻ ý kiến.'
  return 'Không thể lưu ý kiến lúc này. Vui lòng kiểm tra thông tin và thử lại.'
}
