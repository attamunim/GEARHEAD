const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('gearhead', {
  catalog: {
    list: () => ipcRenderer.invoke('catalog:list'),
    add: (payload) => ipcRenderer.invoke('catalog:add', payload),
  },
  customer: {
    create: (payload) => ipcRenderer.invoke('customer:create', payload),
    find: (query) => ipcRenderer.invoke('customer:find', query),
    get: (id) => ipcRenderer.invoke('customer:get', id),
    recent: (limit) => ipcRenderer.invoke('customer:recent', limit),
    list: () => ipcRenderer.invoke('customer:list'),
    update: (payload) => ipcRenderer.invoke('customer:update', payload),
    delete: (id) => ipcRenderer.invoke('customer:delete', id),
    visits: (id) => ipcRenderer.invoke('customer:visits', id),
  },
  job: {
    create: (payload) => ipcRenderer.invoke('job:create', payload),
    setItems: (payload) => ipcRenderer.invoke('job:setItems', payload),
    getItems: (jobId) => ipcRenderer.invoke('job:getItems', jobId),
    complete: (jobId) => ipcRenderer.invoke('job:complete', jobId),
    get: (jobId) => ipcRenderer.invoke('job:get', jobId),
    listActive: () => ipcRenderer.invoke('job:listActive'),
  },
  bill: {
    getByJob: (jobId) => ipcRenderer.invoke('bill:getByJob', jobId),
    recent: (limit) => ipcRenderer.invoke('bill:recent', limit),
  },
  reminders: {
    list: () => ipcRenderer.invoke('reminders:list'),
  },
  reports: {
    get: () => ipcRenderer.invoke('reports:get'),
  },
  backup: {
    create: () => ipcRenderer.invoke('backup:create'),
    restore: () => ipcRenderer.invoke('backup:restore'),
    autoStatus: () => ipcRenderer.invoke('backup:autoStatus'),
    chooseAutoDir: () => ipcRenderer.invoke('backup:chooseAutoDir'),
  },
  phone: {
    call: (mobile) => ipcRenderer.invoke('phone:call', mobile),
  },
});
