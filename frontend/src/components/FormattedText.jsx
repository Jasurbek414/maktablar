import React from 'react';

/** **qalin matn** ichidagi qismlarni <strong> qilib bo'ladi, qolganini oddiy matn sifatida qaytaradi. */
function renderInline(text, keyPrefix) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={`${keyPrefix}-${i}`} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={`${keyPrefix}-${i}`}>{part}</React.Fragment>;
  });
}

/**
 * AI javoblarini yengil formatlab ko'rsatadi — to'liq markdown kutubxonasi qo'shmasdan
 * (yangi bog'liqlik kiritmaslik uchun): **qalin matn**, "- " / "* " ro'yxatlar, "1. "
 * raqamli ro'yxatlar, va oddiy qatorlar. Boshqa hamma narsa xavfsiz matn sifatida chiqadi.
 */
export default function FormattedText({ text }) {
  const lines = (text || '').split('\n');
  const blocks = [];
  let currentList = null; // { type: 'ul' | 'ol', items: [] }

  const flushList = () => {
    if (currentList) {
      blocks.push(currentList);
      currentList = null;
    }
  };

  lines.forEach((line, i) => {
    const bulletMatch = line.match(/^\s*[-*]\s+(.*)$/);
    const numberedMatch = line.match(/^\s*\d+[.)]\s+(.*)$/);

    if (bulletMatch) {
      if (!currentList || currentList.type !== 'ul') { flushList(); currentList = { type: 'ul', items: [] }; }
      currentList.items.push(bulletMatch[1]);
    } else if (numberedMatch) {
      if (!currentList || currentList.type !== 'ol') { flushList(); currentList = { type: 'ol', items: [] }; }
      currentList.items.push(numberedMatch[1]);
    } else {
      flushList();
      blocks.push({ type: 'p', text: line });
    }
    if (i === lines.length - 1) flushList();
  });

  return (
    <>
      {blocks.map((b, i) => {
        if (b.type === 'ul') {
          return (
            <ul key={i} className="list-disc pl-4 my-1 space-y-0.5">
              {b.items.map((item, j) => <li key={j}>{renderInline(item, `${i}-${j}`)}</li>)}
            </ul>
          );
        }
        if (b.type === 'ol') {
          return (
            <ol key={i} className="list-decimal pl-4 my-1 space-y-0.5">
              {b.items.map((item, j) => <li key={j}>{renderInline(item, `${i}-${j}`)}</li>)}
            </ol>
          );
        }
        if (b.text === '') return <div key={i} className="h-2" />;
        return <p key={i} className="leading-relaxed">{renderInline(b.text, `${i}`)}</p>;
      })}
    </>
  );
}
