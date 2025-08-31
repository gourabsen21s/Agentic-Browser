export interface Tab {
  id: string;
  title: string;
  url: string;
  favicon: string | null;
  isActive: boolean;
  isLoading: boolean;
}

export interface AppShortcut {
  id: string;
  name: string;
  url: string;
  icon: React.ReactNode;
  color: string;
}
