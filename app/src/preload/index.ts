import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronAPI } from './index.d'

const api: ElectronAPI = {
  getState: () => ipcRenderer.invoke('app:getState'),
  health: () => ipcRenderer.invoke('app:health'),
  ativar: (payload) => ipcRenderer.invoke('auth:ativar', payload),
  logout: () => ipcRenderer.invoke('auth:logout'),
  listarLancamentos: () => ipcRenderer.invoke('lancamentos:listar'),
  criarLancamento: (input) => ipcRenderer.invoke('lancamentos:criar', input),
  finalizarLancamento: (id) => ipcRenderer.invoke('lancamentos:finalizar', id),
  cancelarLancamento: (id) => ipcRenderer.invoke('lancamentos:cancelar', id),
  sync: () => ipcRenderer.invoke('sync:run'),
  machineName: () => ipcRenderer.invoke('app:machineName'),
  version: () => ipcRenderer.invoke('app:version')
}

contextBridge.exposeInMainWorld('api', api)
