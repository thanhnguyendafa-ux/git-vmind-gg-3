import React from 'react';
import { createPortal } from 'react-dom';
import Icon from '../../../components/ui/Icon';

interface DeleteConfirmDialogProps {
    title: string;
    message: string;
    itemName: string;
    onConfirm: () => void;
    onCancel: () => void;
    isDeleting?: boolean;
}

const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
    title,
    message,
    itemName,
    onConfirm,
    onCancel,
    isDeleting = false
}) => {
    return createPortal(
        <div className="fixed inset-0 bg-black/80 z-[2100] flex items-center justify-center p-4 animate-fadeIn backdrop-blur-sm">
            <div className="bg-white dark:bg-secondary-800 rounded-2xl max-w-md w-full shadow-2xl">
                {/* Icon */}
                <div className="p-6 flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
                        <Icon name="trash" className="w-8 h-8 text-red-600 dark:text-red-400" />
                    </div>

                    <h2 className="text-xl font-bold text-text-main dark:text-secondary-100 mb-2">
                        {title}
                    </h2>

                    <p className="text-sm text-text-subtle mb-4">
                        {message}
                    </p>

                    <div className="p-3 bg-secondary-50 dark:bg-secondary-700/50 rounded-lg w-full">
                        <p className="text-sm font-semibold text-text-main dark:text-secondary-100 break-words">
                            {itemName}
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 p-6 pt-0">
                    <button
                        onClick={onCancel}
                        disabled={isDeleting}
                        className="flex-1 px-4 py-2 bg-secondary-100 dark:bg-secondary-700 text-text-main dark:text-secondary-100 rounded-lg hover:bg-secondary-200 dark:hover:bg-secondary-600 transition-colors font-medium disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default DeleteConfirmDialog;
