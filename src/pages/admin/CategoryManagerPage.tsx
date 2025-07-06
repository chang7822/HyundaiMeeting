import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { getAdminProfileCategories, getAdminProfileOptions, saveAdminProfileCategories, saveAdminProfileOptions } from '../../services/api.ts';

import { FaPlus, FaTrash, FaEdit, FaSave, FaTimes, FaArrowUp, FaArrowDown } from 'react-icons/fa';
import { toast } from 'react-toastify';

const SIDEBAR_WIDTH = 280;

const Container = styled.div<{ $sidebarOpen: boolean }>`
  display: flex;
  flex-direction: row;
  width: 100vw;
  min-height: 100vh;
  background: #f7f7fa;
  margin-left: ${props => (props.$sidebarOpen ? `${SIDEBAR_WIDTH}px` : '0')};
  transition: margin-left 0.3s;
  @media (max-width: 768px) {
    margin-left: 0;
    width: 100vw;
  }
`;
const Sidebar = styled.div`
  width: 320px;
  background: #ede7f6;
  border-right: 1.5px solid #e0e0e0;
  padding: 32px 18px 32px 24px;
  min-height: 100vh;
`;
const Main = styled.div`
  flex: 1;
  padding: 40px 32px;
  min-height: 100vh;
`;
const Title = styled.h2`
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 24px;
`;
const CategoryList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;
const CategoryItem = styled.li<{ selected: boolean }>`
  padding: 12px 16px;
  background: ${p => p.selected ? '#d1c4e9' : 'transparent'};
  border-radius: 8px;
  margin-bottom: 8px;
  font-weight: 600;
  color: #4F46E5;
  cursor: pointer;
  transition: background 0.15s;
  display: flex;
  align-items: center;
  justify-content: space-between;
  &:hover { background: #d1c4e9; }
`;
const OptionList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;
const OptionItem = styled.li`
  padding: 10px 16px;
  background: #fff;
  border-radius: 8px;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
  box-shadow: 0 1px 4px rgba(80,60,180,0.04);
  display: flex;
  align-items: center;
  justify-content: space-between;
`;
const IconBtn = styled.button`
  background: none;
  border: none;
  color: #7C3AED;
  font-size: 1.1em;
  margin-left: 6px;
  cursor: pointer;
  &:hover { color: #4F46E5; }
`;
const AddBtn = styled.button`
  background: #7C3AED;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 7px 16px;
  font-weight: 600;
  margin-bottom: 12px;
  margin-top: 4px;
  cursor: pointer;
  font-size: 1em;
  display: flex;
  align-items: center;
  gap: 6px;
  &:hover { background: #4F46E5; }
`;
const SaveBtn = styled.button`
  background: #4F46E5;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 10px 28px;
  font-weight: 700;
  font-size: 1.1em;
  margin-bottom: 18px;
  margin-left: 12px;
  cursor: pointer;
  float: right;
  &:hover { background: #7C3AED; }
`;
const Input = styled.input`
  font-size: 1em;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1.5px solid #bbb;
  margin-right: 8px;
  min-width: 60px;
`;

function getNextOrder(arr: any[]) {
  return arr.length > 0 ? Math.max(...arr.map(x => x.display_order || 0)) + 1 : 1;
}

const CategoryManagerPage: React.FC<{ sidebarOpen?: boolean }> = ({ sidebarOpen = true }) => {
  const [categories, setCategories] = useState<any[]>([]);
  const [options, setOptions] = useState<any[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  // 임시 상태 관리
  const [catEditId, setCatEditId] = useState<number | null>(null);
  const [catEditValue, setCatEditValue] = useState('');
  const [catAddMode, setCatAddMode] = useState(false);
  const [catAddValue, setCatAddValue] = useState('');
  const [optEditId, setOptEditId] = useState<number | null>(null);
  const [optEditValue, setOptEditValue] = useState('');
  const [optAddMode, setOptAddMode] = useState(false);
  const [optAddValue, setOptAddValue] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getAdminProfileCategories(),
      getAdminProfileOptions()
    ]).then(([cats, opts]) => {
      setCategories(cats);
      setOptions(opts);
      if (cats.length > 0) setSelectedCatId(cats[0].id);
    }).finally(() => setLoading(false));
  }, []);

  // 카테고리 추가
  const handleAddCategory = () => {
    if (!catAddValue.trim()) return;
    const newCat = {
      id: Date.now(), // 임시 id
      name: catAddValue,
      gender: 'common',
      display_order: getNextOrder(categories),
      created_at: new Date().toISOString(),
      _new: true,
    };
    setCategories([...categories, newCat]);
    setCatAddValue('');
    setCatAddMode(false);
    setSelectedCatId(newCat.id);
  };
  // 카테고리 수정
  const handleEditCategory = (cat: any) => {
    setCatEditId(cat.id);
    setCatEditValue(cat.name);
  };
  const handleSaveEditCategory = (cat: any) => {
    setCategories(categories.map(c => c.id === cat.id ? { ...c, name: catEditValue } : c));
    setCatEditId(null);
    setCatEditValue('');
  };
  // 카테고리 삭제
  const handleDeleteCategory = (cat: any) => {
    if (!window.confirm('정말 삭제할까요? (옵션도 함께 삭제됨)')) return;
    setCategories(categories.map(c => c.id === cat.id ? { ...c, _delete: true } : c));
    setOptions(options.map(o => o.category_id === cat.id ? { ...o, _delete: true } : o));
    if (selectedCatId === cat.id) setSelectedCatId(categories.length > 1 ? categories.find(c => c.id !== cat.id)?.id : null);
  };

  // 옵션 추가
  const handleAddOption = () => {
    if (!optAddValue.trim() || !selectedCatId) return;
    const newOpt = {
      id: Date.now(),
      category_id: selectedCatId,
      option_text: optAddValue,
      display_order: getNextOrder(options.filter(o => o.category_id === selectedCatId)),
      created_at: new Date().toISOString(),
      _new: true,
    };
    setOptions([...options, newOpt]);
    setOptAddValue('');
    setOptAddMode(false);
  };
  // 옵션 수정
  const handleEditOption = (opt: any) => {
    setOptEditId(opt.id);
    setOptEditValue(opt.option_text);
  };
  const handleSaveEditOption = (opt: any) => {
    setOptions(options.map(o => o.id === opt.id ? { ...o, option_text: optEditValue } : o));
    setOptEditId(null);
    setOptEditValue('');
  };
  // 옵션 삭제
  const handleDeleteOption = (opt: any) => {
    if (!window.confirm('정말 삭제할까요?')) return;
    setOptions(options.map(o => o.id === opt.id ? { ...o, _delete: true } : o));
  };

  // 옵션 순서 변경 핸들러
  const handleMoveOption = (opt: any, direction: 'up' | 'down') => {
    const sameCatOptions = options.filter(o => o.category_id === opt.category_id && !o._delete);
    const sorted = [...sameCatOptions].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    const idx = sorted.findIndex(o => o.id === opt.id);
    if (idx === -1) return;
    let targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;
    // display_order swap
    const optA = sorted[idx];
    const optB = sorted[targetIdx];
    setOptions(options.map(o => {
      if (o.id === optA.id) return { ...o, display_order: optB.display_order };
      if (o.id === optB.id) return { ...o, display_order: optA.display_order };
      return o;
    }));
  };

  // 저장
  const handleSaveAll = async () => {
    // 옵션 추가 input에 값이 남아있으면 자동으로 추가
    if (optAddMode && optAddValue.trim() && selectedCatId) {
      handleAddOption();
    }
    // === 삭제(_delete: true) 옵션/카테고리도 함께 전송 ===
    // 1. 옵션: option_text/카테고리 없는 옵션 제외, 임시 id(Date.now())는 id 제거, _delete 옵션도 포함
    const preparedOptions = options
      .filter(o => o.category_id && o.option_text && o.option_text.trim() !== '')
      .map(o => {
        const opt = { ...o };
        if (String(opt.id).length > 10 || opt._new) delete opt.id; // 임시 id 제거
        delete opt._new; delete opt.__typename;
        return opt;
      });
    // 2. 카테고리도 동일하게 처리
    const preparedCategories = categories
      .filter(c => c.name && c.name.trim() !== '')
      .map(c => {
        const cat = { ...c };
        if (String(cat.id).length > 10 || cat._new) delete cat.id;
        delete cat._new; delete cat.__typename;
        return cat;
      });
    console.log('[저장 직전 options]', preparedOptions);
    console.log('[저장 직전 categories]', preparedCategories);
    try {
      await saveAdminProfileCategories(preparedCategories);
      await saveAdminProfileOptions(preparedOptions);
      toast.success('DB에 정상적으로 반영되었습니다!');
      // 저장 후 목록 새로고침
      setLoading(true);
      const [cats, opts] = await Promise.all([
        getAdminProfileCategories(),
        getAdminProfileOptions()
      ]);
      setCategories(cats);
      setOptions(opts);
      // 임시 id로 선택된 카테고리가 있으면, 이름이 같은 카테고리의 실제 id로 동기화
      if (selectedCatId) {
        const prevCat = categories.find(c => c.id === selectedCatId);
        if (prevCat) {
          const newCat = cats.find(c => c.name === prevCat.name && c.gender === prevCat.gender);
          if (newCat) setSelectedCatId(newCat.id);
          else setSelectedCatId(cats.length > 0 ? cats[0].id : null);
        } else {
          setSelectedCatId(cats.length > 0 ? cats[0].id : null);
        }
      } else {
        setSelectedCatId(cats.length > 0 ? cats[0].id : null);
      }
      setLoading(false);
    } catch (e: any) {
      toast.error('저장에 실패했습니다. ' + (e?.message || ''));
    }
  };

  const selectedOptions = selectedCatId ? options.filter(o => o.category_id === selectedCatId && !o._delete).sort((a, b) => (a.display_order || 0) - (b.display_order || 0)) : [];
  const selectedCat = categories.find(c => c.id === selectedCatId);

  return (
    <Container $sidebarOpen={sidebarOpen}>
      <Sidebar>
        <Title>카테고리</Title>
        {/* <AddBtn onClick={() => setCatAddMode(true)}><FaPlus /> 카테고리 추가</AddBtn> */}
        {/* 카테고리 추가/수정/삭제 버튼 제거, 목록만 표시 */}
        {catAddMode && false && (
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
            <Input value={catAddValue} onChange={e => setCatAddValue(e.target.value)} placeholder="카테고리명" autoFocus />
            <IconBtn onClick={handleAddCategory}><FaSave /></IconBtn>
            <IconBtn onClick={() => { setCatAddMode(false); setCatAddValue(''); }}><FaTimes /></IconBtn>
          </div>
        )}
        {loading ? <div style={{color:'#aaa'}}>로딩 중...</div> : (
          <CategoryList>
            {categories.map(cat => (
              <CategoryItem key={cat.id} selected={cat.id === selectedCatId} onClick={() => setSelectedCatId(cat.id)}>
                <span>{cat.name} <span style={{fontWeight:400,fontSize:'0.97em',color:'#888'}}>({cat.gender})</span></span>
                {/* 수정/삭제 버튼 제거 */}
              </CategoryItem>
            ))}
          </CategoryList>
        )}
      </Sidebar>
      <Main>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <Title>옵션 {selectedCat ? `- ${selectedCat.name}` : ''}</Title>
          <SaveBtn onClick={handleSaveAll}>저장</SaveBtn>
        </div>
        <AddBtn onClick={() => setOptAddMode(true)} style={{marginBottom:18}}><FaPlus /> 옵션 추가</AddBtn>
        {optAddMode && (
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
            <Input value={optAddValue} onChange={e => setOptAddValue(e.target.value)} placeholder="옵션명" autoFocus />
            <IconBtn onClick={handleAddOption}><FaSave /></IconBtn>
            <IconBtn onClick={() => { setOptAddMode(false); setOptAddValue(''); }}><FaTimes /></IconBtn>
          </div>
        )}
        {loading ? <div style={{color:'#aaa'}}>로딩 중...</div> : (
          <OptionList>
            {selectedOptions.length === 0 && <div style={{color:'#aaa'}}>옵션 없음</div>}
            {selectedOptions.map((opt, idx) => (
              <OptionItem key={opt.id}>
                {optEditId === opt.id ? (
                  <>
                    <Input value={optEditValue} onChange={e => setOptEditValue(e.target.value)} autoFocus />
                    <IconBtn onClick={() => handleSaveEditOption(opt)}><FaSave /></IconBtn>
                    <IconBtn onClick={() => { setOptEditId(null); setOptEditValue(''); }}><FaTimes /></IconBtn>
                  </>
                ) : (
                  <>
                    <span>{opt.option_text}</span>
                    <span>
                      <IconBtn onClick={() => handleMoveOption(opt, 'up')} title="위로" disabled={idx === 0} style={idx === 0 ? {opacity:0.3, pointerEvents:'none'} : {}}><FaArrowUp /></IconBtn>
                      <IconBtn onClick={() => handleMoveOption(opt, 'down')} title="아래로" disabled={idx === selectedOptions.length-1} style={idx === selectedOptions.length-1 ? {opacity:0.3, pointerEvents:'none'} : {}}><FaArrowDown /></IconBtn>
                      <IconBtn onClick={() => handleEditOption(opt)} title="수정"><FaEdit /></IconBtn>
                      <IconBtn onClick={() => handleDeleteOption(opt)} title="삭제"><FaTrash /></IconBtn>
                    </span>
                  </>
                )}
              </OptionItem>
            ))}
          </OptionList>
        )}
      </Main>
    </Container>
  );
};

export default CategoryManagerPage; 