/**
 * 프로필에 표시할 회사명을 반환합니다.
 * 회사 ID가 9000번 이상인 경우(프리랜서/자영업, 기타 회사) custom_company_name을 우선 표시합니다.
 * 
 * @param company - 회사명 (user_profiles.company)
 * @param customCompanyName - 사용자 입력 회사명 (user_profiles.custom_company_name)
 * @returns 표시할 회사명
 */
export function getDisplayCompanyName(company?: string | null, customCompanyName?: string | null): string | undefined {
  // 회사명이 없으면 custom_company_name 반환
  if (!company) {
    return customCompanyName || undefined;
  }

  // 회사 ID가 9000번 이상인 회사들 (프리랜서/자영업: 9999, 기타 회사: 9998)
  // 회사명으로 판단 (DB에서 회사명이 "프리랜서/자영업" 또는 "기타 회사"로 저장됨)
  const specialCompanyNames = ['프리랜서/자영업', '기타 회사'];
  
  if (specialCompanyNames.includes(company)) {
    // custom_company_name이 있으면 우선 표시, 없으면 회사명 표시
    return customCompanyName || company;
  }

  // 일반 회사의 경우 company 표시
  return company || customCompanyName || undefined;
}

