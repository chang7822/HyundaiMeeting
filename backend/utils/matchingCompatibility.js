/**
 * 회원매칭조회(내가/나를/매칭가능)와 동일한 로직으로 매칭 통계 계산
 * auth.js 회원가입 알림 등에서 재사용
 */
const { supabase } = require('../database');

function ensureArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
      if (parsed) return [parsed];
    } catch (e) {
      return [value];
    }
    return [value];
  }
  return [];
}

function extractSido(residence) {
  if (!residence || typeof residence !== 'string') return null;
  const trimmed = residence.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(/\s+/);
  return parts[0] || null;
}

/**
 * owner의 선호 기준으로 target이 맞는지 판단
 * @param {object} target - 상대 프로필
 * @param {object} owner - 기준(내) 프로필 (선호 기준 포함)
 * @param {Map|null} companyMap - 회사 id -> name 매핑
 */
function profileMatchesPreference(target, owner, companyMap = null) {
  if (!owner) return false;
  const targetBirthYear = target.birth_year;
  const ownerBirthYear = owner.birth_year;

  if (ownerBirthYear && (owner.preferred_age_min != null || owner.preferred_age_max != null)) {
    if (!targetBirthYear) return false;
    const minBirth = ownerBirthYear - (owner.preferred_age_max ?? 0);
    const maxBirth = ownerBirthYear - (owner.preferred_age_min ?? 0);
    if (targetBirthYear < minBirth || targetBirthYear > maxBirth) return false;
  }

  if (owner.preferred_height_min != null) {
    if (typeof target.height !== 'number' || target.height < owner.preferred_height_min) return false;
  }
  if (owner.preferred_height_max != null) {
    if (typeof target.height !== 'number' || target.height > owner.preferred_height_max) return false;
  }

  const prefBodyTypes = ensureArray(owner.preferred_body_types);
  if (prefBodyTypes.length > 0) {
    const targetBodyTypes = ensureArray(target.body_type);
    if (targetBodyTypes.length === 0 || !prefBodyTypes.some(type => targetBodyTypes.includes(type))) {
      return false;
    }
  }

  const prefEducations = ensureArray(owner.preferred_educations);
  if (prefEducations.length > 0) {
    if (!target.education || !prefEducations.includes(target.education)) {
      return false;
    }
  }

  const prefMarital = ensureArray(owner.preferred_marital_statuses);
  if (prefMarital.length > 0) {
    if (!target.marital_status || !prefMarital.includes(target.marital_status)) {
      return false;
    }
  }

  const prefRegions = Array.isArray(owner.prefer_region) ? owner.prefer_region : [];
  if (prefRegions.length > 0) {
    const targetSido = extractSido(target.residence);
    if (!targetSido || !prefRegions.includes(targetSido)) {
      return false;
    }
  }

  if (companyMap && companyMap.size > 0) {
    const prefCompanyNames = Array.isArray(owner.prefer_company)
      ? owner.prefer_company
          .map(id => companyMap.get(id))
          .filter(name => !!name)
      : [];
    if (prefCompanyNames.length > 0) {
      const targetCompany = typeof target.company === 'string' ? target.company.trim() : '';
      if (!targetCompany || !prefCompanyNames.includes(targetCompany)) {
        return false;
      }
    }
  }

  return true;
}

async function loadCompanyMap() {
  try {
    const { data: companies, error } = await supabase
      .from('companies')
      .select('id, name')
      .eq('is_active', true);

    if (error || !companies || companies.length === 0) return null;
    const map = new Map();
    companies.forEach(c => {
      if (c && c.id !== undefined && c.name) map.set(c.id, c.name);
    });
    return map;
  } catch (e) {
    console.error('[matchingCompatibility] 회사 목록 조회 오류:', e);
    return null;
  }
}

/**
 * 현재 프로필 기준 매칭 통계 계산 (회원매칭조회 내가/나를 로직과 동일)
 * @param {number} userId - 기준 사용자 ID (방금 가입한 회원)
 * @returns {{ iPreferCount: number, preferMeCount: number, mutualCount: number }} 또는 오류 시 null
 */
async function computeMatchingCountsForUser(userId) {
  try {
    const companyMap = await loadCompanyMap();

    const { data: subjectProfile, error: subjectError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (subjectError || !subjectProfile) {
      return null;
    }

    const { data: otherRows, error: othersError } = await supabase
      .from('user_profiles')
      .select(`
        *,
        user:users(id, is_active, is_banned, is_admin)
      `)
      .neq('user_id', userId);

    if (othersError) return null;

    const others = (otherRows || []).filter(row => {
      const u = row.user;
      if (!u) return false;
      if (u.is_admin) return false;
      if (u.is_banned) return false;
      if (u.is_active === false) return false;
      return true;
    });

    const subjectGender = subjectProfile?.gender || null;
    let iPreferCount = 0;
    let preferMeCount = 0;
    let mutualCount = 0;

    for (const other of others) {
      const otherGender = other?.gender || null;
      if (subjectGender && otherGender && subjectGender === otherGender) continue;

      const fitsMyPreference = profileMatchesPreference(other, subjectProfile, companyMap);
      const iFitTheirPreference = profileMatchesPreference(subjectProfile, other, companyMap);
      const mutual = fitsMyPreference && iFitTheirPreference;

      if (fitsMyPreference) iPreferCount++;
      if (iFitTheirPreference) preferMeCount++;
      if (mutual) mutualCount++;
    }

    return { iPreferCount, preferMeCount, mutualCount };
  } catch (e) {
    console.error('[matchingCompatibility] computeMatchingCountsForUser 오류:', e);
    return null;
  }
}

module.exports = {
  computeMatchingCountsForUser,
  profileMatchesPreference,
  loadCompanyMap,
};
