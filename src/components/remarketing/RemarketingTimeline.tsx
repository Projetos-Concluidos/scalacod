import { Clock, Send, Gift } from "lucide-react";

interface Step {
  step_order: number;
  delay_days: number;
  send_hour: string;
  message_template: string;
  discount_value: number;
}

interface Props {
  steps: Step[];
  activeStep: number;
  onSelectStep: (idx: number) => void;
  discountEnabled: boolean;
  discountType: string;
}

const RemarketingTimeline = ({ steps, activeStep, onSelectStep, discountEnabled, discountType }: Props) => {
  return (
    <div className="ninja-card p-4">
      <h4 className="font-semibold text-foreground text-sm mb-4 flex items-center gap-2">
        <Clock className="h-4 w-4 text-primary" /> Timeline de Disparos
      </h4>
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-border" />

        <div className="flex justify-between relative">
          {steps.map((step, idx) => {
            const isActive = idx === activeStep;
            const hasDiscount = discountEnabled && step.discount_value > 0;

            return (
              <button
                key={idx}
                onClick={() => onSelectStep(idx)}
                className="flex flex-col items-center group relative z-10"
                style={{ minWidth: 72 }}
              >
                {/* Node */}
                <div className={`
                  flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all
                  ${isActive
                    ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                    : "border-border bg-card text-muted-foreground group-hover:border-primary/50"
                  }
                `}>
                  {hasDiscount ? (
                    <Gift className="h-4 w-4" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </div>

                {/* Label */}
                <div className="mt-2 text-center">
                  <p className={`text-xs font-bold ${isActive ? "text-primary" : "text-foreground"}`}>
                    D{step.delay_days}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{step.send_hour}</p>
                  {hasDiscount && (
                    <span className="inline-block mt-1 text-[10px] bg-warning/15 text-warning px-1.5 py-0.5 rounded-full font-semibold">
                      {discountType === "percentage" ? `${step.discount_value}%` : `R$${step.discount_value}`}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RemarketingTimeline;
