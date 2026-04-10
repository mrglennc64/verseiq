
import * as React from "react";

interface TabsProps {
  defaultValue: string;
  className?: string;
  children: React.ReactNode;
}

interface TabsListProps {
  className?: string;
  children: React.ReactNode;
}

interface TabsTriggerProps {
  value: string;
  className?: string;
  children: React.ReactNode;
}

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
}

export function Tabs({ defaultValue, className, children }: TabsProps) {
  const [active, setActive] = React.useState(defaultValue);
  // Provide context via props
  return (
    <div className={className}>{
      React.Children.map(children, child => {
        if (typeof child === "object" && child && 'type' in child) {
          // Pass active and setActive to children
          return React.cloneElement(child as any, { active, setActive });
        }
        return child;
      })
    }</div>
  );
}

export function TabsList({ className, children, active, setActive }: TabsListProps & { active?: string, setActive?: (v: string) => void }) {
  return (
    <div className={className}>
      {React.Children.map(children, child => {
        if (typeof child === "object" && child && 'type' in child) {
          return React.cloneElement(child as any, { active, setActive });
        }
        return child;
      })}
    </div>
  );
}

export function TabsTrigger({ value, className, children, active, setActive }: TabsTriggerProps & { active?: string, setActive?: (v: string) => void }) {
  return (
    <button
      className={className + (active === value ? ' bg-white font-bold' : '')}
      onClick={() => setActive && setActive(value)}
      type="button"
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, children, active }: TabsContentProps & { active?: string }) {
  if (active !== value) return null;
  return <div>{children}</div>;
}
