import React, { memo } from 'react';
import { Card, CardContent } from '@/ui/atoms/card';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export const FeatureCard = memo(function FeatureCard({
  icon,
  title,
  description,
}: FeatureCardProps) {
  return (
    <Card className="border bg-card/50 hover:bg-card hover:shadow-md transition-[background-color,box-shadow] duration-300 group">
      <CardContent className="p-4 flex gap-4">
        <div className="p-2.5 rounded-xl bg-primary/5 text-primary group-hover:bg-primary/10 transition-colors h-fit">
          {icon}
        </div>
        <div className="space-y-1">
          <h5 className="font-semibold text-sm text-foreground">{title}</h5>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
});
