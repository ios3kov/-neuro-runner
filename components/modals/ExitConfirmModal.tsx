import React from 'react';
import { Dialog } from '../Dialog';
export const ExitConfirmModal: React.FC<{isOpen:boolean;onCancel:()=>void;onConfirm:()=>void}> = ({isOpen,onCancel,onConfirm}) => <Dialog open={isOpen} title="Exit session?" onClose={onCancel}><p className="nr-muted">Return to the profile screen. Your preferences and archive history will be kept.</p><div className="flex gap-3 mt-6"><button className="nr-secondary flex-1" data-autofocus onClick={onCancel}>CANCEL</button><button className="nr-primary flex-1" onClick={onConfirm}>EXIT SESSION</button></div></Dialog>;
