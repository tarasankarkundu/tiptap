import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'welcome',
      component: () => import('@/views/WelcomeView.vue'),
    },
    {
      path: '/doc/:id',
      name: 'document-view',
      component: () => import('@/views/DocumentViewPage.vue'),
      props: true,
    },
    {
      path: '/doc/:id/edit',
      name: 'document-edit',
      component: () => import('@/views/DocumentEditPage.vue'),
      props: true,
    },
  ],
})

export default router
