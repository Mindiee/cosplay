import { transition } from './domain.js';
import { makeSeed } from './seed.js';

const DATABASE = 'closet-demo-v2';
const STORE = 'state';
const KEY = 'main';
const CHANNEL = 'closet-demo-v2';

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('อ่านฐานข้อมูลไม่สำเร็จ'));
  });
}

function transactionComplete(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error('บันทึกข้อมูลไม่สำเร็จ'));
    transaction.onerror = () => {};
  });
}

function openDatabase() {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('เบราว์เซอร์นี้ไม่รองรับ IndexedDB'));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('เปิดฐานข้อมูลไม่สำเร็จ'));
    request.onblocked = () => reject(new Error('ฐานข้อมูลกำลังถูกใช้งานในแท็บอื่น'));
  });
}

function announce(channel) {
  channel?.postMessage({type:'changed'});
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('closet:changed'));
}

export async function createRepository() {
  const database = await openDatabase();
  const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel(CHANNEL) : null;
  if (channel && typeof window !== 'undefined') channel.onmessage = () => window.dispatchEvent(new CustomEvent('closet:changed'));

  async function read() {
    const transaction = database.transaction(STORE,'readonly');
    const value = await requestResult(transaction.objectStore(STORE).get(KEY));
    await transactionComplete(transaction);
    return value;
  }

  async function initialize() {
    const transaction = database.transaction(STORE,'readwrite');
    const store = transaction.objectStore(STORE);
    const existing = await requestResult(store.get(KEY));
    if (existing === undefined) store.put(makeSeed(Date.now()),KEY);
    await transactionComplete(transaction);
  }

  async function dispatch(action, payload = {}) {
    const transaction = database.transaction(STORE,'readwrite');
    const store = transaction.objectStore(STORE);
    let result;
    try {
      const state = await requestResult(store.get(KEY));
      if (state === undefined) throw new Error('ไม่พบข้อมูลระบบ');
      const days = Number(state.settings?.clockOffsetDays ?? 0);
      result = transition(state,action,payload,Date.now() + days * 86400000);
      store.put(state,KEY);
    } catch (error) {
      transaction.abort();
      try { await transactionComplete(transaction); } catch {}
      throw error;
    }
    await transactionComplete(transaction);
    announce(channel);
    return result;
  }

  await initialize();
  return {read,dispatch};
}
import { normalizeCosplayState, transitionCosplay } from './cosplay-domain.js';
import { makeCosplaySeed } from './cosplay-seed.js';
import { mergeStudioCatalog } from './studio-domain.js';

export async function createCosplayRepository(catalog=null) {
  const key='cosplay-v1',database=await openDatabase();
  const channel=typeof BroadcastChannel==='function'?new BroadcastChannel(CHANNEL):null;
  if(channel&&typeof window!=='undefined')channel.onmessage=()=>window.dispatchEvent(new CustomEvent('closet:changed'));
  const init=database.transaction(STORE,'readwrite'),store=init.objectStore(STORE),done=transactionComplete(init);
  const existing=await requestResult(store.get(key));
  if(existing===undefined){const legacy=await requestResult(store.get(KEY));store.put(normalizeCosplayState(mergeStudioCatalog(makeCosplaySeed(Date.now(),legacy),catalog)),key);}
  else {normalizeCosplayState(existing);mergeStudioCatalog(existing,catalog);store.put(existing,key);}
  await done;
  return {
    async read(){const tx=database.transaction(STORE,'readonly'),done=transactionComplete(tx);const value=normalizeCosplayState(await requestResult(tx.objectStore(STORE).get(key)));await done;return value;},
    async dispatch(action,payload={},actor){
      const tx=database.transaction(STORE,'readwrite'),done=transactionComplete(tx),store=tx.objectStore(STORE);let result;
      try{const state=normalizeCosplayState(await requestResult(store.get(key)));const actorId=typeof actor==='object'?actor?.actorId:actor;result=transitionCosplay(state,action,payload,Date.now(),actorId===undefined?payload.actorId:actorId);store.put(state,key);}
      catch(error){tx.abort();try{await done;}catch{}throw error;}
      await done;announce(channel);return result;
    }
  };
}
