import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const isVideo = (url = '') => Boolean((url || '').match(/\.(mp4|webm|ogg|mov)(\?|$)/i));

export default function ProductCard({
  id,
  title,
  price,
  originalPrice,
  rating,
  reviewCount,
  badge,
  badgeVariant = 'new',
  image,
  mediaUrls,
  onClick,
}) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) return onClick();
    if (id) navigate(`/product/${id}`);
  };

  const allMedia    = Array.isArray(mediaUrls) && mediaUrls.length > 0 ? mediaUrls : image ? [image] : [];
  const thumbnailUrl      = allMedia.find(u => !isVideo(u)) || allMedia[0] || null;
  const thumbnailIsVideo  = thumbnailUrl ? isVideo(thumbnailUrl) : false;
  const hasVideo          = allMedia.some(u => isVideo(u));

  return (
    <div
      className="bg-surface-container-lowest rounded-t-[16px] rounded-b-lg level-1-shadow flex flex-col overflow-hidden hover:level-2-shadow transition-all hover:-translate-y-1 cursor-pointer"
      onClick={handleClick}
    >
      <motion.div layoutId={`product-img-${id}`} className="relative w-full h-48 bg-surface-container" transition={{ duration: 0.4, ease: 'easeInOut' }}>
        {thumbnailIsVideo ? (
          // All media are videos — show a static first-frame preview (no autoPlay)
          <video
            src={thumbnailUrl}
            muted
            playsInline
            preload="metadata"
            className="w-full h-full object-cover pointer-events-none"
          />
        ) : (
          <img
            className="w-full h-full object-cover"
            src={thumbnailUrl ?? undefined}
            alt={title}
          />
        )}
        {hasVideo && (
          <div className="absolute bottom-2 right-2 bg-black/50 text-white rounded-full p-1.5 pointer-events-none">
            <span className="material-symbols-outlined text-[16px] leading-none block" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
          </div>
        )}
        {badge && (
          <div
            className={`absolute top-sm left-sm px-2 py-1 rounded font-label-sm text-[10px] font-bold ${
              badgeVariant === 'sale'
                ? 'bg-error text-on-error'
                : 'bg-secondary text-on-secondary'
            }`}
          >
            {badge}
          </div>
        )}
      </motion.div>
      <div className="p-sm flex flex-col flex-grow">
        <h3 className="font-body-md text-body-md text-primary line-clamp-2 leading-tight mb-xs">
          {title}
        </h3>
        {(rating || reviewCount) && (
          <div className="flex items-center gap-1 mb-xs mt-auto">
            <span
              className="material-symbols-outlined text-secondary text-[12px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              star
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              {rating} ({reviewCount})
            </span>
          </div>
        )}
        <div className="flex items-end gap-2">
          <span
            className={`font-headline-sm text-headline-sm ${
              originalPrice ? 'text-error' : 'text-primary-container'
            }`}
          >
            RM {price}
          </span>
          {originalPrice && (
            <span className="font-label-sm text-label-sm text-on-surface-variant line-through pb-[2px]">
              RM {originalPrice}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
