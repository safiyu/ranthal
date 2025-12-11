import React from 'react';
import clsx from 'clsx';

interface SliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    valueDisplay?: React.ReactNode;
    className?: string;
}

export function Slider({ label, valueDisplay, className, ...props }: SliderProps) {
    // Calculate percentage for background fill
    const min = props.min ? Number(props.min) : 0;
    const max = props.max ? Number(props.max) : 100;
    const val = props.value ? Number(props.value) : 0;
    const percentage = ((val - min) * 100) / (max - min);

    return (
        <div className={clsx("w-full", className)}>
            {(label || valueDisplay) && (
                <div className="flex justify-between items-center mb-2">
                    {label && <label className="text-xs text-slate-400">{label}</label>}
                    {valueDisplay && <span className="text-xs text-white mobile:text-sky-300">{valueDisplay}</span>}
                </div>
            )}
            <div className="relative w-full h-6 flex items-center">
                {/* Track Background */}
                <div className="absolute w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    {/* Fill Bar */}
                    <div
                        className="h-full bg-teal-500 transition-all duration-75"
                        style={{ width: `${percentage}%` }}
                    />
                </div>

                {/* Native Input (Invisible but interactive) */}
                <input
                    type="range"
                    {...props}
                    className="absolute w-full h-full opacity-0 cursor-pointer z-10"
                />

                {/* Custom Thumb (Visual Only) */}
                <div
                    className="absolute h-4 w-4 bg-white rounded-full shadow-lg pointer-events-none transition-all duration-75"
                    style={{
                        left: `calc(${percentage}% - 8px)`
                    }}
                />
            </div>
        </div>
    );
}
