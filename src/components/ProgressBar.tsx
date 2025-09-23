import { centsToDisplay } from "@/lib/currency";

interface ProgressBarProps {
  current: number; // Amount in cents
  target: number;  // Amount in cents
  className?: string;
}

const ProgressBar = ({ current, target, className = "" }: ProgressBarProps) => {
  const percentage = Math.min((current / target) * 100, 100);
  
  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between text-sm text-muted-foreground mb-2">
        <span>{centsToDisplay(current)} raised</span>
        <span>{percentage.toFixed(0)}%</span>
      </div>
      <div className="h-3 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full progress-gradient transition-all duration-500 ease-out rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="text-sm text-muted-foreground mt-1">
        Goal: {centsToDisplay(target)}
      </div>
    </div>
  );
};

export default ProgressBar;