import { createRouter, createWebHashHistory } from 'vue-router'
import Settings from '../components/Settings.vue'
import ReplyPopup from '../components/ReplyPopup.vue'

const routes = [
  {
    path: '/',
    name: 'Settings',
    component: Settings
  },
  {
    path: '/popup',
    name: 'ReplyPopup',
    component: ReplyPopup
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router 