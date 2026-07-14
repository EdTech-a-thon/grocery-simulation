export type Product = {
  id: string
  name: string
  price: number
  image: string
  note: string
}

export const products: Product[] = [
  {
    id: 'apple',
    name: 'Apple',
    price: 0.89,
    image: '/images/apple.svg',
    note: 'Fresh red apple',
  },
  {
    id: 'banana',
    name: 'Banana',
    price: 0.59,
    image: '/images/banana.svg',
    note: 'Single ripe banana',
  },
  {
    id: 'bread',
    name: 'Bread',
    price: 2.79,
    image: '/images/bread.svg',
    note: 'Soft bread loaf',
  },
  {
    id: 'milk',
    name: 'Milk',
    price: 3.29,
    image: '/images/milk.svg',
    note: 'Whole milk, 1 gallon',
  },
  {
    id: 'soymilk',
    name: 'Soy Milk',
    price: 3.49,
    image: '/images/soymilk.svg',
    note: 'Plant-based milk',
  },
]

export const productById = Object.fromEntries(products.map((product) => [product.id, product]))
