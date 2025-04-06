import { createRouter, createWebHashHistory } from 'vue-router'
import Settings from '@/components/Settings.vue'
import ReplyPopup from '@/components/ReplyPopup.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'settings',
      component: Settings
    },
    {
      path: '/popup',
      name: 'popup',
      component: ReplyPopup
    }
  ]
})

export default router 