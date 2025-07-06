import React, { useState } from 'react';
import styled from 'styled-components';
import regions from '../assets/korea_regions.json';

const ModalBackground = styled.div`
  position: fixed; left: 0; top: 0; width: 100vw; height: 100vh;
  background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; z-index: 1000;
`;

const ModalCard = styled.div`
  background: #fff; border-radius: 16px; padding: 2rem; min-width: 320px; max-width: 90vw;
  box-shadow: 0 8px 32px rgba(0,0,0,0.18);
`;

const Title = styled.h2`
  margin-bottom: 1.5rem; text-align: center; color: #333;
`;

const Select = styled.select`
  width: 100%; padding: 12px; margin-bottom: 1rem; border-radius: 8px; border: 1.5px solid #764ba2;
  font-size: 1rem;
`;

const Button = styled.button`
  width: 100%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff; border: none; border-radius: 8px; padding: 12px; font-size: 1rem; font-weight: 600;
  cursor: pointer; margin-top: 1rem;
`;

type AddressSelectModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (sido: string, gugun: string) => void;
  defaultSido?: string;
  defaultGugun?: string;
};

const AddressSelectModal: React.FC<AddressSelectModalProps> = ({
  isOpen, onClose, onSelect, defaultSido = '', defaultGugun = ''
}) => {
  const [selectedSido, setSelectedSido] = useState(defaultSido);
  const [selectedGugun, setSelectedGugun] = useState(defaultGugun);

  // 시/도 변경 시 구/군 초기화
  const handleSidoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSido(e.target.value);
    setSelectedGugun('');
  };

  const handleGugunChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedGugun(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSido && selectedGugun) {
      onSelect(selectedSido, selectedGugun);
      onClose();
    }
  };

  if (!isOpen) return null;

  // 선택된 시/도의 구/군 목록
  const gugunList = regions.find(r => r.sido === selectedSido)?.guguns || [];

  return (
    <ModalBackground onClick={onClose}>
      <ModalCard onClick={e => e.stopPropagation()}>
        <Title>주소 선택</Title>
        <form onSubmit={handleSubmit}>
          <Select value={selectedSido} onChange={handleSidoChange} required>
            <option value="">시/도 선택</option>
            {regions.map(region => (
              <option key={region.sido} value={region.sido}>{region.sido}</option>
            ))}
          </Select>
          <Select value={selectedGugun} onChange={handleGugunChange} required disabled={!selectedSido}>
            <option value="">구/군 선택</option>
            {gugunList.map(gugun => (
              <option key={gugun} value={gugun}>{gugun}</option>
            ))}
          </Select>
          <Button type="submit" disabled={!selectedSido || !selectedGugun}>선택 완료</Button>
        </form>
      </ModalCard>
    </ModalBackground>
  );
};

export default AddressSelectModal; 