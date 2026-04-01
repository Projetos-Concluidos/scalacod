import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
}

const PageHeader = ({ title, subtitle, badge, actions }: PageHeaderProps) => {
  return (
    <div className="flex items-start justify-between mb-8 pt-2">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-foreground">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
};

export default PageHeader;
