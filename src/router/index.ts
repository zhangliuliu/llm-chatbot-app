import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '@/layout/MainLayout.vue'
import ChatView from '@/views/ChatView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: MainLayout,
      children: [
          {
              path: '',
              name: 'home',
              component: ChatView
          },
          {
              path: 'c/:id',
              name: 'chat-session',
              component: ChatView
          }
      ]
    },
  ],
})

export default router
