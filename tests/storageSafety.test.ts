import { describe, expect, it, vi } from 'vitest';
import { createSafeStorage } from '../utils/safeStorage';
import { sanitizeCore } from '../state/persistedCore';
import { sanitizeHistory } from '../utils/history';
import { DEFAULT_SETTINGS } from '../state/coreConfig';
describe('optional browser storage',()=>{
  it('does not throw when the storage accessor is blocked',async()=>{
    const storage=createSafeStorage(()=>{throw new Error('SecurityError');});
    expect(await storage.getItem('test')).toBeNull();
    expect(()=>storage.setItem('test','value')).not.toThrow();
    expect(()=>storage.removeItem('test')).not.toThrow();
  });
  it('deduplicates identical persisted data but saves changed data',()=>{
    const data=new Map<string,string>();
    const setItem=vi.fn((key:string,value:string)=>data.set(key,value));
    const target={getItem:(key:string)=>data.get(key)||null,setItem,removeItem:(key:string)=>data.delete(key)} as unknown as Storage;
    const storage=createSafeStorage(()=>target);
    storage.setItem('a','one');storage.setItem('a','one');storage.setItem('a','two');
    expect(setItem).toHaveBeenCalledTimes(2);
  });
  it('retries writes after a quota failure',()=>{
    const setItem=vi.fn().mockImplementationOnce(()=>{throw new Error('QuotaExceeded');});
    const storage=createSafeStorage(()=>({setItem}) as unknown as Storage);
    storage.setItem('a','one');storage.setItem('a','one');expect(setItem).toHaveBeenCalledTimes(2);
  });
});
describe('untrusted persisted shapes',()=>{
  it.each([null,undefined,0,'bad',[],{user:null},{user:{settings:false}}])('normalizes %j',raw=>{
    expect(sanitizeCore(raw).user.settings).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeCore(raw).viewMode).toBe('GRID');
  });
  it('keeps valid preferences and never merges persisted actions',()=>{
    const safe=sanitizeCore({user:{username:' ILYA ',settings:{soundEnabled:false}},logout:'malicious',viewMode:'LIST'});
    expect(safe.user.username).toBe('ILYA');expect(safe.user.settings.soundEnabled).toBe(false);expect(safe.viewMode).toBe('LIST');expect(safe).not.toHaveProperty('logout');
  });
  it('preserves historical scores and ignores invalid records',()=>{
    const safe=sanitizeHistory({stats:{SNAKE:{highScore:42,plays:3,maxLevelReached:5},BROKEN:null},achievements:['FIRST','FIRST',null]});
    expect(safe.stats.SNAKE.highScore).toBe(42);expect(safe.stats.SNAKE.plays).toBe(3);expect(safe.stats).not.toHaveProperty('BROKEN');expect(safe.achievements).toEqual(['FIRST']);
  });
});
