import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from '../../../components/ui/Icon';

interface BlockingLoaderProps {
    isVisible: boolean;
    message?: string;
}

const BlockingLoader: React.FC<BlockingLoaderProps> = ({ isVisible, message = 'Preparing sample data...' }) => {
    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-white/60 dark:bg-secondary-900/60 backdrop-blur-md"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white dark:bg-secondary-800 p-8 rounded-2xl shadow-2xl border border-purple-100 dark:border-purple-900/30 flex flex-col items-center gap-6 max-w-sm w-full mx-4"
                    >
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-purple-100 dark:border-purple-900/20 rounded-full" />
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                                className="absolute inset-0 w-16 h-16 border-4 border-t-purple-600 rounded-full"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Icon name="book-open" className="w-6 h-6 text-purple-600" variant="filled" />
                            </div>
                        </div>

                        <div className="text-center">
                            <h3 className="text-lg font-bold text-text-main dark:text-secondary-100 mb-1">
                                Please Wait
                            </h3>
                            <p className="text-sm text-text-subtle">
                                {message}
                            </p>
                        </div>

                        <div className="w-full bg-secondary-100 dark:bg-secondary-700 h-1 rounded-full overflow-hidden">
                            <motion.div
                                animate={{
                                    x: ["-100%", "100%"]
                                }}
                                transition={{
                                    repeat: Infinity,
                                    duration: 1.5,
                                    ease: "easeInOut"
                                }}
                                className="w-1/2 h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full"
                            />
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default BlockingLoader;
