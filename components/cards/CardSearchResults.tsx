// components/cards/CardSearchResults.tsx
import { CardResultRow } from "./CardResultRow";

const MOCK_CARDS = [
  {
    id: "1",
    name: "Darth Vader, Dark Lord",
    set: "SHD",
    type: "Unit",
    image: "/mock/vader.jpg",
    recommendedCondition: "NM",
    variants: {
      NM: { price: 79.9, stock: 12 },
      EX: { price: 69.9, stock: 4 },
      VG: { price: 0, stock: 0 },
      G: { price: 49.9, stock: 1 },
    },
  },
];

export function CardSearchResults() {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between text-sm text-white/60">
        <span>1 resultado</span>
      </div>

      <div className="space-y-4">
        {MOCK_CARDS.map((card) => (
          <CardResultRow key={card.id} card={card} />
        ))}
      </div>
    </div>
  );
}
