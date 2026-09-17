import React from 'react';
import { Dialog } from '../Dialog';
interface Props {isOpen:boolean;fileName?:string;fileIcon?:string;content?:string;onClose:()=>void;}
export const FileViewerModal: React.FC<Props> = ({isOpen,fileName,content,onClose}) => <Dialog open={isOpen && !!fileName} title={fileName || 'Archive file'} onClose={onClose}><p className="nr-kicker mb-4">FICTIONAL ARCHIVE / READ ONLY</p><pre className="whitespace-pre-wrap break-words text-sm leading-6 select-text">{content}</pre></Dialog>;
