import { getDemoStore } from './demoStore'
import { isDemoMode } from './mode'

export const demoMode = isDemoMode

function demo() {
  return getDemoStore()
}

function remote() {
  return import('./remoteStore')
}

export function loadAll() {
  return demoMode ? Promise.resolve(demo().loadAll()) : remote().then((store) => store.loadAll())
}

export function resetDemo() {
  if (!demoMode) return Promise.resolve(null)
  return Promise.resolve(demo().reset())
}

export function saveProduct(input) {
  return demoMode ? Promise.resolve(demo().saveProduct(input)) : remote().then((store) => store.saveProduct(input))
}

export function deleteProduct(id) {
  return demoMode ? Promise.resolve(demo().deleteProduct(id)) : remote().then((store) => store.deleteProduct(id))
}

export function saveCustomer(input) {
  return demoMode ? Promise.resolve(demo().saveCustomer(input)) : remote().then((store) => store.saveCustomer(input))
}

export function deleteCustomer(id) {
  return demoMode ? Promise.resolve(demo().deleteCustomer(id)) : remote().then((store) => store.deleteCustomer(id))
}

export function createOrder(input) {
  return demoMode ? Promise.resolve(demo().createOrder(input)) : remote().then((store) => store.createOrder(input))
}

export function updateOrderStatus(id, patch) {
  return demoMode
    ? Promise.resolve(demo().updateOrderStatus(id, patch))
    : remote().then((store) => store.updateOrderStatus(id, patch))
}

export function deleteOrder(id) {
  return demoMode ? Promise.resolve(demo().deleteOrder(id)) : remote().then((store) => store.deleteOrder(id))
}

export function signIn(email, password) {
  return remote().then((store) => store.signIn(email, password))
}

export function signUp(email, password) {
  return remote().then((store) => store.signUp(email, password))
}

export function signOut() {
  return remote().then((store) => store.signOut())
}

export function currentSession() {
  return remote().then((store) => store.currentSession())
}

export function watchAuth(callback) {
  return remote().then((store) => store.watchAuth(callback))
}
