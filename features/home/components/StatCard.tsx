import * as React from 'react';
import Icon from '../../../components/ui/Icon';
import { Card, CardContent } from '../../../components/ui/Card';

interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, onClick }) => {
  const content = (
    <CardContent className="p-3 flex items-center gap-3">
        <Icon name={icon} className="w-6 h-6 text-primary-500" />
        <div>
            <p className="text-xs text-text-subtle font-medium">{label}</p>
            <p className="text-lg font-bold text-text-main dark:text-secondary-100">{value}</p>
        </div>
    </CardContent>
  );

  if (onClick) {
    return (
      <button onClick={onClick} className="w-full text-left h-full">
        <Card className="hover:bg-secondary-50 dark:hover:bg-secondary-800/50 transition-colors h-full">
            {content}
        </Card>
      </button>
    );
  }

  return (
    <Card>
      {content}
    </Card>
  );
};

export default StatCard;
