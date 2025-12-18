
import * as React from 'react';
import { Table, Folder } from '../../../types';
import FileTreeItem from './FileTreeItem';

interface FileTreeProps {
  folders: Folder[];
  tables: (Partial<Table> & { id: string; name: string })[];
  currentFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onSelectTable: (tableId: string) => void;
}

const FileTree: React.FC<FileTreeProps> = ({
  folders,
  tables,
  currentFolderId,
  onSelectFolder,
  onSelectTable,
}) => {
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());

  // Auto-expand folder if selected via other means (e.g. breadcrumbs)
  React.useEffect(() => {
    if (currentFolderId && !expandedIds.has(currentFolderId)) {
      setExpandedIds(prev => new Set(prev).add(currentFolderId));
    }
  }, [currentFolderId]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Group tables by folder
  const tablesInFolders = React.useMemo(() => {
    const map = new Map<string, typeof tables>();
    folders.forEach(f => {
      map.set(f.id, tables.filter(t => f.tableIds.includes(t.id)));
    });
    return map;
  }, [folders, tables]);

  // Find orphans (tables not in any known folder)
  const orphanTables = React.useMemo(() => {
    const allFolderTableIds = new Set(folders.flatMap(f => f.tableIds));
    return tables.filter(t => !allFolderTableIds.has(t.id));
  }, [tables, folders]);

  return (
    <div className="flex flex-col gap-0.5 py-2">
      {/* Root / Workspace */}
      <FileTreeItem
        label="Workspace"
        icon="home"
        level={0}
        isSelected={currentFolderId === null}
        onSelect={() => onSelectFolder(null)}
        hasChildren={true}
        isExpanded={true} // Always visually expanded to show content
        onToggle={() => {}} // No-op, root always open
      />

      <div className="flex flex-col gap-0.5 relative">
        {/* Indentation Guide Line */}
        <div className="absolute left-[17px] top-0 bottom-0 w-px bg-secondary-200 dark:bg-secondary-800" />

        {/* Folders */}
        {folders.map(folder => {
          const folderTables = tablesInFolders.get(folder.id) || [];
          const isExpanded = expandedIds.has(folder.id);
          const hasChildren = folderTables.length > 0;

          return (
            <React.Fragment key={folder.id}>
              <FileTreeItem
                label={folder.name}
                icon="folder"
                iconColor="text-warning-500"
                level={1}
                isSelected={currentFolderId === folder.id}
                hasChildren={hasChildren}
                isExpanded={isExpanded}
                onToggle={() => toggleExpand(folder.id)}
                onSelect={() => {
                    onSelectFolder(folder.id);
                    if (!isExpanded) toggleExpand(folder.id);
                }}
              />
              
              {isExpanded && hasChildren && (
                <div className="flex flex-col gap-0.5 relative">
                   {/* Sub-Indentation Guide Line */}
                   <div className="absolute left-[29px] top-0 bottom-2 w-px bg-secondary-200 dark:bg-secondary-800" />
                   
                   {folderTables.map(table => (
                    <FileTreeItem
                      key={table.id}
                      label={table.name}
                      icon="table-cells"
                      iconColor="text-primary-500"
                      level={2}
                      isSelected={false} // Table selection navigates away, so usually not persistent in tree unless we track activeTableId
                      onSelect={() => onSelectTable(table.id)}
                    />
                  ))}
                </div>
              )}
            </React.Fragment>
          );
        })}

        {/* Orphan Tables (Uncategorized) */}
        {orphanTables.map(table => (
          <FileTreeItem
            key={table.id}
            label={table.name}
            icon="table-cells"
            iconColor="text-primary-500"
            level={1}
            isSelected={false}
            onSelect={() => onSelectTable(table.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default FileTree;
