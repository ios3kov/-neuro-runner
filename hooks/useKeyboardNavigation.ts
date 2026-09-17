import { useEffect, useState } from 'react';
import type { ViewMode } from '../types';
interface Identifiable {id:string;}
interface Props<T> {items:T[];viewMode:ViewMode;isActive:boolean;onNavigate:(item:T)=>void;}
export function useKeyboardNavigation<T extends Identifiable>({items,viewMode,isActive}:Props<T>){
  const [focusedId,setFocusedId]=useState<string|null>(null);
  useEffect(()=>{
    if(!isActive)return;
    const keydown=(event:KeyboardEvent)=>{
      if(event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey||event.isComposing||document.querySelector('dialog[open]'))return;
      if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
      const active=document.activeElement;
      if(active instanceof HTMLElement && (active.matches('input,textarea,select')||active.isContentEditable))return;
      // Tree view has native focusable row buttons; do not hijack their structure.
      const nodes=viewMode==='TREE'?[...document.querySelectorAll<HTMLElement>('[data-tree-node]')]:items.map(item=>document.getElementById(`node-${item.id}`)).filter((node):node is HTMLElement=>!!node);
      if(!nodes.length)return;
      if(active instanceof HTMLElement && active!==document.body && !active.id.startsWith('node-') && !active.hasAttribute('data-tree-node'))return;
      let index=nodes.indexOf(active as HTMLElement);
      let step=1;
      if(viewMode==='GRID'&&['ArrowUp','ArrowDown'].includes(event.key)){
        const grid=nodes[0].parentElement;
        if(grid)step=window.getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length||1;
      }
      if(event.key==='ArrowLeft'||event.key==='ArrowUp')step=-step;
      index=index<0?0:Math.max(0,Math.min(nodes.length-1,index+step));
      event.preventDefault(); nodes[index].focus({preventScroll:true}); nodes[index].scrollIntoView({block:'nearest',behavior:'auto'}); setFocusedId(nodes[index].id.slice(5));
    };
    window.addEventListener('keydown',keydown);
    return()=>window.removeEventListener('keydown',keydown);
  },[items,viewMode,isActive]);
  return{focusedId,setFocusedId};
}
