import React from 'react';
import { useNavigate } from 'react-router-dom';

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
  onClick,
}) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) return onClick();
    if (id) navigate(`/product/${id}`);
  };

  return (
    <div
      className="bg-surface-container-lowest rounded-t-[16px] rounded-b-lg level-1-shadow flex flex-col overflow-hidden hover:level-2-shadow transition-all hover:-translate-y-1 cursor-pointer"
      onClick={handleClick}
    >
      <div className="relative w-full h-48 bg-surface-container">
        <img className="w-full h-full object-cover" src={image} alt={title} />
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
      </div>
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
