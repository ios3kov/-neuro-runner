import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppState, type GameId } from '../types';
vi.mock('../utils/audio',()=>({audio:new Proxy({}, {get:()=>vi.fn()})}));
vi.mock('../utils/haptics',()=>({haptics:new Proxy({}, {get:()=>vi.fn()})}));
vi.stubGlobal('localStorage',{getItem:()=>null,setItem:()=>{},removeItem:()=>{}});
const {useStore}=await import('../store');
const initial=useStore.getState();
beforeEach(()=>useStore.setState({...initial,appState:AppState.DESKTOP}));
describe('production state regressions',()=>{
  it('closes the authentication gate atomically after consuming its target',()=>{
    useStore.getState().openModal('AUTH','personal');
    expect(useStore.getState().consumeAuthTarget()).toBe('personal');
    expect(useStore.getState().activeModal).toBe('NONE');
    expect(useStore.getState().authTargetId).toBeNull();
  });
  it('clears transient state on logout without deleting preferences',()=>{
    useStore.setState({currentGame:'AI_CHAT',activeModal:'STATS',openedFileId:'copyright',navigationPath:['root','vault'],isKeyboardOpen:true});
    const settings=useStore.getState().user.settings;
    useStore.getState().logout();
    expect(useStore.getState()).toMatchObject({appState:AppState.LOGIN,currentGame:null,activeModal:'NONE',openedFileId:null,navigationPath:['root'],isKeyboardOpen:false});
    expect(useStore.getState().user.settings).toEqual(settings);
  });
  it('sanitizes same-version corrupt preferences instead of shallow-merging them',()=>{
    const restored=useStore.persist.getOptions().merge!({user:{settings:null},viewMode:'INVALID'},useStore.getState());
    expect(restored.user.settings).toEqual(initial.user.settings);
    expect(restored.viewMode).toBe('GRID');
    expect(restored.user.sessionToken).toBe('');
  });
  it('rejects removed internal executables',()=>{
    useStore.getState().startGame('REMOVED_GAME' as GameId);
    expect(useStore.getState().appState).toBe(AppState.DESKTOP);
  });
});
