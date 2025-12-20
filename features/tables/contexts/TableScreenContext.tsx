
import * as React from 'react';
import { Table, VocabRow, Relation, Column } from '../../../types';

interface TableScreenState {
  table: Table;
  activeTab: 'view' | 'relations' | 'settings';
  setActiveTab: (tab: 'view' | 'relations' | 'settings') => void;

  // Modal States
  rowToView: VocabRow | null;
  setRowToView: (row: VocabRow | null) => void;
  rowToEdit: VocabRow | null;
  setRowToEdit: (row: VocabRow | null) => void;
  isQuickAddMode: boolean;
  setIsQuickAddMode: (isQuick: boolean) => void;
  previewRow: VocabRow | null;
  setPreviewRow: (row: VocabRow | null) => void;

  isPublishModalOpen: boolean;
  setIsPublishModalOpen: (isOpen: boolean) => void;
  isColumnEditorOpen: boolean;
  setIsColumnEditorOpen: (isOpen: boolean) => void;
  isBatchAiModalOpen: boolean;
  setIsBatchAiModalOpen: (isOpen: boolean) => void;
  isBatchDeleteConfirmOpen: boolean;
  setIsBatchDeleteConfirmOpen: (isOpen: boolean) => void;

  relationToEdit: Relation | null;
  setRelationToEdit: (rel: Relation | null) => void;
  relationToDelete: Relation | null;
  setRelationToDelete: (rel: Relation | null) => void;

  columnToConfigureAI: Column | null;
  setColumnToConfigureAI: (col: Column | null) => void;
  linkTemplateCol: Column | null;
  setLinkTemplateCol: (col: Column | null) => void;

  pasteData: { rows: string[][] } | null;
  setPasteData: (data: { rows: string[][] } | null) => void;
  isConceptPickerOpen: boolean;
  setIsConceptPickerOpen: (isOpen: boolean) => void;
}

const TableScreenContext = React.createContext<TableScreenState | undefined>(undefined);

export const TableScreenProvider: React.FC<{ table: Table; children: React.ReactNode }> = ({ table, children }) => {
  const [activeTab, setActiveTab] = React.useState<'view' | 'relations' | 'settings'>('view');

  const [rowToView, setRowToView] = React.useState<VocabRow | null>(null);
  const [rowToEdit, setRowToEdit] = React.useState<VocabRow | null>(null);
  const [isQuickAddMode, setIsQuickAddMode] = React.useState(false);
  const [previewRow, setPreviewRow] = React.useState<VocabRow | null>(null);

  const [isPublishModalOpen, setIsPublishModalOpen] = React.useState(false);
  const [isColumnEditorOpen, setIsColumnEditorOpen] = React.useState(false);
  const [isBatchAiModalOpen, setIsBatchAiModalOpen] = React.useState(false);
  const [isBatchDeleteConfirmOpen, setIsBatchDeleteConfirmOpen] = React.useState(false);

  const [relationToEdit, setRelationToEdit] = React.useState<Relation | null>(null);
  const [relationToDelete, setRelationToDelete] = React.useState<Relation | null>(null);

  const [columnToConfigureAI, setColumnToConfigureAI] = React.useState<Column | null>(null);
  const [linkTemplateCol, setLinkTemplateCol] = React.useState<Column | null>(null);

  const [pasteData, setPasteData] = React.useState<{ rows: string[][] } | null>(null);
  const [isConceptPickerOpen, setIsConceptPickerOpen] = React.useState(false);

  const value = {
    table,
    activeTab, setActiveTab,
    rowToView, setRowToView,
    rowToEdit, setRowToEdit,
    isQuickAddMode, setIsQuickAddMode,
    previewRow, setPreviewRow,
    isPublishModalOpen, setIsPublishModalOpen,
    isColumnEditorOpen, setIsColumnEditorOpen,
    isBatchAiModalOpen, setIsBatchAiModalOpen,
    isBatchDeleteConfirmOpen, setIsBatchDeleteConfirmOpen,
    relationToEdit, setRelationToEdit,
    relationToDelete, setRelationToDelete,
    columnToConfigureAI, setColumnToConfigureAI,
    linkTemplateCol, setLinkTemplateCol,
    pasteData, setPasteData,
    isConceptPickerOpen, setIsConceptPickerOpen
  };

  return (
    <TableScreenContext.Provider value={value}>
      {children}
    </TableScreenContext.Provider>
  );
};

export const useTableScreen = () => {
  const context = React.useContext(TableScreenContext);
  if (!context) throw new Error('useTableScreen must be used within TableScreenProvider');
  return context;
};
