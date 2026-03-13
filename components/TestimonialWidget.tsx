
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Quote, Star, ChevronLeft, ChevronRight } from 'lucide-react';

interface Testimonial {
  id: number;
  name: string;
  role: string;
  content: string;
  rating: number;
  avatar: string;
}

const DEFAULT_TESTIMONIALS: Testimonial[] = [
  {
    id: 1,
    name: "Sarah Johnson",
    role: "Verified Customer",
    content: "The Ginger Shot Recovery has completely changed my morning routine. I feel more energized and focused throughout the day.",
    rating: 5,
    avatar: "https://picsum.photos/seed/sarah/100/100"
  },
  {
    id: 2,
    name: "Michael Chen",
    role: "Health Enthusiast",
    content: "Excellent quality and fast delivery. The packaging was secure and the product is exactly as described. Highly recommend!",
    rating: 5,
    avatar: "https://picsum.photos/seed/michael/100/100"
  },
  {
    id: 3,
    name: "Amara Okoro",
    role: "Business Owner",
    content: "I've tried many supplements, but Magira's ginger shots are on another level. The potency is real. My digestion has improved significantly.",
    rating: 5,
    avatar: "https://picsum.photos/seed/amara/100/100"
  }
];

interface TestimonialWidgetProps {
  testimonials?: Testimonial[];
}

const TestimonialWidget: React.FC<TestimonialWidgetProps> = ({ testimonials = DEFAULT_TESTIMONIALS }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [testimonials.length]);

  const next = () => setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  const prev = () => setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);

  const testimonial = testimonials[currentIndex];

  return (
    <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 flex flex-col h-full relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-8 opacity-5">
        <Quote size={120} />
      </div>

      <div className="flex justify-between items-center mb-6 relative z-10">
        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Customer Voices</h3>
        <div className="flex gap-1">
          {[...Array(testimonial.rating)].map((_, i) => (
            <Star key={i} size={12} className="fill-amber-400 text-amber-400" />
          ))}
        </div>
      </div>

      <div className="flex-1 relative z-10 min-h-[120px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={testimonial.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <p className="text-slate-600 font-medium italic leading-relaxed text-lg">
              "{testimonial.content}"
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-8 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-4">
          <img 
            src={testimonial.avatar} 
            alt={testimonial.name}
            className="w-12 h-12 rounded-full border-2 border-slate-50 shadow-sm"
            referrerPolicy="no-referrer"
          />
          <div>
            <p className="font-black text-slate-900 leading-tight">{testimonial.name}</p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{testimonial.role}</p>
          </div>
        </div>

        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={prev}
            className="w-8 h-8 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center hover:bg-slate-800 hover:text-white transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <button 
            onClick={next}
            className="w-8 h-8 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center hover:bg-slate-800 hover:text-white transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-50">
        <motion.div 
          key={currentIndex}
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 5, ease: "linear" }}
          className="h-full bg-emerald-500"
        />
      </div>
    </div>
  );
};

export default TestimonialWidget;
