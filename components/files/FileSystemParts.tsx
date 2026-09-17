import React from 'react';
import type { FileNode } from '../../types';
import { getIcon } from '../../data/fileSystem';
export const PARENT_ID='..parent';
export interface ParentLinkNode {id:typeof PARENT_ID;name:string;type:'FOLDER';isParentLink:true;description?:string;isHidden?:boolean;isPasswordProtected?:boolean;gameId?:undefined;children?:undefined;externalUrl?:undefined;}
export type NavigableNode=FileNode|ParentLinkNode;
export const isParentNode=(node:NavigableNode):node is ParentLinkNode=>node.id===PARENT_ID;
interface ItemProps {node:NavigableNode;isParent:boolean;isFocused:boolean;tileHeight?:number;addr?:string;size?:number;perm?:string;onNavigate:(node:FileNode)=>void;onUpLevel:()=>void;}
export const DecorLayer=React.memo(()=> <div aria-hidden="true" className="absolute inset-0 pointer-events-none opacity-20" style={{backgroundImage:'radial-gradient(#317385 1px, transparent 1px)',backgroundSize:'24px 24px'}} />);
DecorLayer.displayName='DecorLayer';
export const HeaderStatus=React.memo(({username}:{username:string;sessionStartTime?:number|null})=><p className="nr-muted text-xs mt-2 truncate">LOCAL SESSION <span className="text-cyan-200">/ {username}</span></p>);
HeaderStatus.displayName='HeaderStatus';
export const FileGridItem=React.memo(function FileGridItem({node,isParent,onNavigate,onUpLevel}:ItemProps){
  return <button type="button" id={`node-${node.id}`} className="nr-file-tile" data-external={!!node.externalUrl} aria-label={isParent?'Parent directory':node.name} onClick={()=>isParent?onUpLevel():onNavigate(node as FileNode)}>
    <span aria-hidden="true" className="text-2xl">{isParent?'↑':getIcon(node as FileNode)}</span>
    <span className="nr-file-name">{isParent?'PARENT DIRECTORY':node.name}</span>
    <span className="nr-file-description">{isParent?'Back one folder':node.externalUrl?'Open game ↗':node.description || `${node.children?.filter(child=>!child.isHidden).length || 0} visible items`}</span>
    <span className="nr-muted text-xs mt-auto">{node.externalUrl?'meow.neurospace.tech':node.type==='FOLDER'?'DIRECTORY':'ARCHIVE FILE'}</span>
  </button>;
});
export const FileListItem=React.memo(function FileListItem({node,isParent,onNavigate,onUpLevel}:ItemProps){
  return <button type="button" id={`node-${node.id}`} className="nr-file-row" aria-label={isParent?'Parent directory':node.name} onClick={()=>isParent?onUpLevel():onNavigate(node as FileNode)}><span aria-hidden="true" className="text-xl shrink-0">{isParent?'↑':getIcon(node as FileNode)}</span><span className="flex flex-col gap-1 min-w-0 flex-1"><span className="nr-file-name">{isParent?'PARENT DIRECTORY':node.name}</span><span className="nr-file-description">{isParent?'Back one folder':node.externalUrl?'Opens meow.neurospace.tech':node.description || 'Directory'}</span></span><span aria-hidden="true" className="nr-muted">{node.externalUrl?'↗':node.type==='FOLDER'?'→':''}</span></button>;
});
