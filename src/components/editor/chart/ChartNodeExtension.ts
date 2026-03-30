import type { CustomComponentRegistration } from '../types'
import { IconChartBar } from '@meldui/tabler-vue'
import ChartNodeView from './ChartNodeView.vue'

/**
 * Pre-built chart node registration for quick document illustrations.
 * Inserts a chart with sample data that can be configured via the chart dialog.
 * For data-driven charts powered by external APIs, use the `customComponents`
 * prop to register your own chart component instead.
 */
export const chartNodeRegistration: CustomComponentRegistration = {
  name: 'meldChart',
  component: ChartNodeView,
  group: 'block',
  atom: true,
  draggable: true,
  attrs: {
    chartType: { default: 'bar' },
    config: {
      default: {
        series: [{ name: 'Revenue', data: [120, 200, 150, 280, 190, 230] }],
        xAxis: { categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'] },
      },
    },
    height: { default: 300 },
  },
  slashCommand: {
    title: 'Chart',
    description: 'Insert a data chart',
    icon: IconChartBar,
    category: 'media',
    keywords: ['chart', 'graph', 'bar', 'line', 'pie', 'data'],
    defaultAttrs: {
      chartType: 'bar',
      config: {
        series: [{ name: 'Revenue', data: [120, 200, 150, 280, 190, 230] }],
        xAxis: { categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'] },
      },
      height: 300,
    },
  },
}
