const PlanUsageBar = ({
  label,
  current,
  limit,
}: {
  label: string;
  current: number;
  limit: number;
}) => {
  const isUnlimited = limit === -1;
  const percentage = isUnlimited ? 0 : limit > 0 ? (current / limit) * 100 : 0;
  const isOver = percentage >= 90;

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className={isOver ? "text-destructive font-medium" : "text-foreground"}>
          {isUnlimited ? `${current} / Ilimitado` : `${current}/${limit}`}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isOver ? "bg-destructive" : "bg-primary"
          }`}
          style={{ width: `${Math.min(isUnlimited ? 0 : percentage, 100)}%` }}
        />
      </div>
    </div>
  );
};

export default PlanUsageBar;
