import { colors } from '@/theme';

export interface NavSection {
  label: string;
  items: NavItem[];
}

export interface NavItem {
  label: string;
  href: string;
  icon: string; // lucide icon name
  roles?: string[]; // restrict to roles; undefined = all
}

export const navSections: NavSection[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Today', href: '/(app)/today', icon: 'CalendarCheck' },
      { label: 'Business Overview', href: '/(app)', icon: 'LayoutDashboard' },
      { label: 'Business Health', href: '/(app)/health', icon: 'Activity' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Sales & POS', href: '/(app)/sales', icon: 'ShoppingCart' },
      { label: 'Products & Services', href: '/(app)/products', icon: 'Package' },
      { label: 'Inventory', href: '/(app)/inventory', icon: 'Boxes' },
      { label: 'Purchases', href: '/(app)/purchases', icon: 'Truck' },
      { label: 'Suppliers', href: '/(app)/suppliers', icon: 'Building2' },
      { label: 'Customers', href: '/(app)/customers', icon: 'Users' },
      { label: 'Invoices', href: '/(app)/invoices', icon: 'FileText' },
      { label: 'Payments', href: '/(app)/payments', icon: 'CreditCard' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { label: 'Expenses', href: '/(app)/expenses', icon: 'Receipt' },
      { label: 'Receivables', href: '/(app)/receivables', icon: 'ArrowDownToLine' },
      { label: 'Payables', href: '/(app)/payables', icon: 'ArrowUpFromLine' },
      { label: 'Reports', href: '/(app)/reports', icon: 'BarChart3' },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { label: 'Analytics', href: '/(app)/analytics', icon: 'TrendingUp' },
      { label: 'AI Assistant', href: '/(app)/ai-assistant', icon: 'Sparkles' },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { label: 'Team', href: '/(app)/team', icon: 'UserCog' },
      { label: 'Subscription', href: '/(app)/billing', icon: 'CreditCard' },
      { label: 'Settings', href: '/(app)/settings', icon: 'Settings' },
      { label: 'Help', href: '/(app)/help', icon: 'HelpCircle' },
    ],
  },
];
