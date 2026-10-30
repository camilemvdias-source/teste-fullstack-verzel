// Base de quadros da demonstração: pinturas em domínio público (CC0) do Art Institute of
// Chicago, com os dados já copiados da API (GET /artworks/:id) no mesmo formato que o
// POST /lots grava (services/artic.js → toLotData). A semente usa esta lista para criar
// os lotes sem depender da API do museu; as imagens são copiadas para o banco depois.
// Gerado em 2026-10-30 a partir de https://api.artic.edu/api/v1/artworks
export const DEMO_ARTWORKS = [
  {
    "externalId": "27992",
    "title": "A Sunday on La Grande Jatte — 1884",
    "imageUrl": "https://www.artic.edu/iiif/2/2d484387-2509-5e8e-2c43-22f9981972eb/full/843,/0/default.jpg",
    "attributes": {
      "artist": "Georges Seurat (French, 1859–1891)",
      "artistName": "Georges Seurat",
      "date": "1884–86, border added 1888–89",
      "medium": "Oil on canvas",
      "dimensions": "207.5 × 308.1 cm (81 3/4 × 121 1/4 in.)",
      "placeOfOrigin": "France",
      "source": "Art Institute of Chicago",
      "sourceUrl": "https://www.artic.edu/artworks/27992"
    }
  },
  {
    "externalId": "16568",
    "title": "Water Lilies",
    "imageUrl": "https://www.artic.edu/iiif/2/3c27b499-af56-f0d5-93b5-a7f2f1ad5813/full/843,/0/default.jpg",
    "attributes": {
      "artist": "Claude Monet (French, 1840–1926)",
      "artistName": "Claude Monet",
      "date": "1906",
      "medium": "Oil on canvas",
      "dimensions": "89.9 × 94.1 cm (35 3/8 × 37 1/16 in.); Framed: 103.2 × 107 × 5.8 cm (40 5/8 × 42 1/8 × 2 1/4 in.)",
      "placeOfOrigin": "France",
      "source": "Art Institute of Chicago",
      "sourceUrl": "https://www.artic.edu/artworks/16568"
    }
  },
  {
    "externalId": "28560",
    "title": "The Bedroom",
    "imageUrl": "https://www.artic.edu/iiif/2/6644829f-f292-c5c4-a73c-0356a6fdbf0d/full/843,/0/default.jpg",
    "attributes": {
      "artist": "Vincent van Gogh (Dutch, 1853–1890)",
      "artistName": "Vincent van Gogh",
      "date": "1889",
      "medium": "Oil on canvas",
      "dimensions": "73.6 × 92.3 cm (29 × 36 5/8 in.); Framed: 88.9 × 108 × 8.9 cm (35 × 42 1/2 × 3 1/2 in.)",
      "placeOfOrigin": "Saint-Rémy-de-Provence",
      "source": "Art Institute of Chicago",
      "sourceUrl": "https://www.artic.edu/artworks/28560"
    }
  },
  {
    "externalId": "20684",
    "title": "Paris Street; Rainy Day",
    "imageUrl": "https://www.artic.edu/iiif/2/f8fd76e9-c396-5678-36ed-6a348c904d27/full/843,/0/default.jpg",
    "attributes": {
      "artist": "Gustave Caillebotte (French, 1848–1894)",
      "artistName": "Gustave Caillebotte",
      "date": "1877",
      "medium": "Oil on canvas",
      "dimensions": "212.2 × 276.2 cm (83 1/2 × 108 3/4 in.); Framed: 241.3 × 306.1 × 10.2 cm (95 × 120 1/2 × 4 in.)",
      "placeOfOrigin": "Paris",
      "source": "Art Institute of Chicago",
      "sourceUrl": "https://www.artic.edu/artworks/20684"
    }
  },
  {
    "externalId": "111436",
    "title": "The Basket of Apples",
    "imageUrl": "https://www.artic.edu/iiif/2/52ac8996-3460-cf71-cb42-5c4d0aa29b74/full/843,/0/default.jpg",
    "attributes": {
      "artist": "Paul Cezanne (French, 1839–1906)",
      "artistName": "Paul Cezanne",
      "date": "c. 1893",
      "medium": "Oil on canvas",
      "dimensions": "65 × 80 cm (25 7/16 × 31 1/2 in.); Framed: 88 × 104.2 × 9.6 cm (34 5/8 × 41 × 3 3/4 in.)",
      "placeOfOrigin": "France",
      "source": "Art Institute of Chicago",
      "sourceUrl": "https://www.artic.edu/artworks/111436"
    }
  },
  {
    "externalId": "56905",
    "title": "Nocturne: Blue and Gold—Southampton Water",
    "imageUrl": "https://www.artic.edu/iiif/2/50034c7f-ce51-00f1-430e-a6f7efc233fc/full/843,/0/default.jpg",
    "attributes": {
      "artist": "James McNeill Whistler (American, 1834–1903)",
      "artistName": "James McNeill Whistler",
      "date": "1872",
      "medium": "Oil on canvas",
      "dimensions": "51 × 76.7 cm (20 1/16 × 30 3/16 in.)",
      "placeOfOrigin": "London",
      "source": "Art Institute of Chicago",
      "sourceUrl": "https://www.artic.edu/artworks/56905"
    }
  },
  {
    "externalId": "14655",
    "title": "Two Sisters (On the Terrace)",
    "imageUrl": "https://www.artic.edu/iiif/2/3a608f55-d76e-fa96-d0b1-0789fbc48f1e/full/843,/0/default.jpg",
    "attributes": {
      "artist": "Pierre-Auguste Renoir (French, 1841–1919)",
      "artistName": "Pierre-Auguste Renoir",
      "date": "1881",
      "medium": "Oil on canvas",
      "dimensions": "100.4 × 80.9 cm (39 1/2 × 31 7/8 in.); Framed: 119.1 × 100.1 × 9.6 cm (46 7/8 × 39 3/8 × 3 3/4 in.)",
      "placeOfOrigin": "France",
      "source": "Art Institute of Chicago",
      "sourceUrl": "https://www.artic.edu/artworks/14655"
    }
  },
  {
    "externalId": "8991",
    "title": "Improvisation No. 30 (Cannons)",
    "imageUrl": "https://www.artic.edu/iiif/2/b5bc6b66-9e6e-fe57-dcec-fc49e820e904/full/843,/0/default.jpg",
    "attributes": {
      "artist": "Vasily Kandinsky\nBorn Moscow (formerly Russian Empire, now Russia), 1866; died Neuilly-sur-Seine, France, 1944",
      "artistName": "Vasily Kandinsky",
      "date": "1913",
      "medium": "Oil on canvas",
      "dimensions": "111 × 111.3 cm (43 11/16 × 43 13/16 in.)",
      "placeOfOrigin": "Germany",
      "source": "Art Institute of Chicago",
      "sourceUrl": "https://www.artic.edu/artworks/8991"
    }
  },
  {
    "externalId": "90048",
    "title": "Distant View of Niagara Falls",
    "imageUrl": "https://www.artic.edu/iiif/2/18092196-50ae-3ff1-9205-1b3110e966c3/full/843,/0/default.jpg",
    "attributes": {
      "artist": "Thomas Cole (American, born England, 1801–1848)",
      "artistName": "Thomas Cole",
      "date": "1830",
      "medium": "Oil on wood panel",
      "dimensions": "47.9 × 60.6 cm (18 7/8 × 23 7/8 in.)",
      "placeOfOrigin": "Niagara Falls",
      "source": "Art Institute of Chicago",
      "sourceUrl": "https://www.artic.edu/artworks/90048"
    }
  },
  {
    "externalId": "64818",
    "title": "Stacks of Wheat (End of Summer)",
    "imageUrl": "https://www.artic.edu/iiif/2/a38e2828-ec6f-ece1-a30f-70243449197b/full/843,/0/default.jpg",
    "attributes": {
      "artist": "Claude Monet (French, 1840–1926)",
      "artistName": "Claude Monet",
      "date": "1890–91",
      "medium": "Oil on canvas",
      "dimensions": "60 × 100.5 cm (23 5/8 × 39 9/16 in.); Framed: 75.6 × 116.6 × 7.4 cm (29 3/4 × 45 7/8 × 2 7/8 in.)",
      "placeOfOrigin": "France",
      "source": "Art Institute of Chicago",
      "sourceUrl": "https://www.artic.edu/artworks/64818"
    }
  },
  {
    "externalId": "61128",
    "title": "At the Moulin Rouge",
    "imageUrl": "https://www.artic.edu/iiif/2/defb4004-b500-218d-3d9b-9a02423f097d/full/843,/0/default.jpg",
    "attributes": {
      "artist": "Henri de Toulouse-Lautrec (French, 1864–1901)",
      "artistName": "Henri de Toulouse-Lautrec",
      "date": "1892–95",
      "medium": "Oil on canvas",
      "dimensions": "123 × 141 cm (48 7/16 × 55 1/2 in.); Framed: 136.9 × 154.7 × 8.5 cm (53 7/8 × 60 7/8 × 3 5/16 in.)",
      "placeOfOrigin": "France",
      "source": "Art Institute of Chicago",
      "sourceUrl": "https://www.artic.edu/artworks/61128"
    }
  },
  {
    "externalId": "111442",
    "title": "The Child's Bath",
    "imageUrl": "https://www.artic.edu/iiif/2/3b885ae0-4d46-5fe4-d70a-00474827f02c/full/843,/0/default.jpg",
    "attributes": {
      "artist": "Mary Cassatt (American, 1844–1926)",
      "artistName": "Mary Cassatt",
      "date": "1893",
      "medium": "Oil on canvas",
      "dimensions": "101.3 × 67.3 cm (39 15/16 × 26 1/2 in.)",
      "placeOfOrigin": "France",
      "source": "Art Institute of Chicago",
      "sourceUrl": "https://www.artic.edu/artworks/111442"
    }
  },
  {
    "externalId": "154235",
    "title": "The Girl by the Window",
    "imageUrl": "https://www.artic.edu/iiif/2/d7df2633-3b40-f570-c906-211503a37cde/full/843,/0/default.jpg",
    "attributes": {
      "artist": "Edvard Munch (Norwegian, 1863–1944)",
      "artistName": "Edvard Munch",
      "date": "1893",
      "medium": "Oil on canvas",
      "dimensions": "96.5 × 65.4 cm (38 × 25 3/4 in.); Framed: 110.5 × 79.4 × 8.9 cm (43 1/2 × 31 1/4 × 3 1/2 in.)",
      "placeOfOrigin": "Norway",
      "source": "Art Institute of Chicago",
      "sourceUrl": "https://www.artic.edu/artworks/154235"
    }
  },
  {
    "externalId": "80607",
    "title": "Self-Portrait",
    "imageUrl": "https://www.artic.edu/iiif/2/47c5bcb8-62ef-e5d7-55e7-f5121f409a30/full/843,/0/default.jpg",
    "attributes": {
      "artist": "Vincent van Gogh (Dutch, 1853–1890)",
      "artistName": "Vincent van Gogh",
      "date": "1887",
      "medium": "Oil on artist's board, mounted on cradled panel",
      "dimensions": "41 × 32.5 cm (16 1/8 × 12 13/16 in.); Framed: 61.6 × 53.4 × 8.9 cm (24 1/4 × 21 × 3 1/2 in.)",
      "placeOfOrigin": "Netherlands",
      "source": "Art Institute of Chicago",
      "sourceUrl": "https://www.artic.edu/artworks/80607"
    }
  },
  {
    "externalId": "11723",
    "title": "Woman at Her Toilette",
    "imageUrl": "https://www.artic.edu/iiif/2/78c80988-6524-cec7-c661-a4c0a706d06f/full/843,/0/default.jpg",
    "attributes": {
      "artist": "Berthe Morisot (French, 1841–1895)",
      "artistName": "Berthe Morisot",
      "date": "1875–80",
      "medium": "Oil on canvas",
      "dimensions": "60.3 × 80.4 cm (23 3/4 × 31 5/8 in.); Framed: 85.8 × 105.5 × 10.5 cm (33 3/4 × 41 1/2 × 4 1/8 in.)",
      "placeOfOrigin": "France",
      "source": "Art Institute of Chicago",
      "sourceUrl": "https://www.artic.edu/artworks/11723"
    }
  },
  {
    "externalId": "14598",
    "title": "The Beach at Sainte-Adresse",
    "imageUrl": "https://www.artic.edu/iiif/2/95be2572-b53d-8e7b-abc9-10eb48d4fa5d/full/843,/0/default.jpg",
    "attributes": {
      "artist": "Claude Monet (French, 1840–1926)",
      "artistName": "Claude Monet",
      "date": "1867",
      "medium": "Oil on canvas",
      "dimensions": "75.8 × 102.5 cm (29 13/16 × 40 5/16 in.); Framed: 104.1 × 130.2 × 11.4 cm (41 × 51 1/2 × 4 1/2 in.)",
      "placeOfOrigin": "France",
      "source": "Art Institute of Chicago",
      "sourceUrl": "https://www.artic.edu/artworks/14598"
    }
  },
  {
    "externalId": "25865",
    "title": "The Herring Net",
    "imageUrl": "https://www.artic.edu/iiif/2/5dca7347-c6dc-24dd-d073-d705b9cdc575/full/843,/0/default.jpg",
    "attributes": {
      "artist": "Winslow Homer (American, 1836–1910)",
      "artistName": "Winslow Homer",
      "date": "1885",
      "medium": "Oil on canvas",
      "dimensions": "76.5 × 122.9 cm (30 1/8 × 48 3/8 in.)",
      "placeOfOrigin": "Prouts Neck",
      "source": "Art Institute of Chicago",
      "sourceUrl": "https://www.artic.edu/artworks/25865"
    }
  },
  {
    "externalId": "109819",
    "title": "Lozenge Composition with Yellow, Black, Blue, Red, and Gray",
    "imageUrl": "https://www.artic.edu/iiif/2/25f660ee-f1db-d13b-42a5-56df97c98ba7/full/843,/0/default.jpg",
    "attributes": {
      "artist": "Piet Mondrian\nDutch, 1872–1944",
      "artistName": "Piet Mondrian",
      "date": "1921",
      "medium": "Oil on canvas",
      "dimensions": "60 × 60 cm (23 5/8 × 23 5/8 in.)",
      "placeOfOrigin": "Netherlands",
      "source": "Art Institute of Chicago",
      "sourceUrl": "https://www.artic.edu/artworks/109819"
    }
  },
  {
    "externalId": "95998",
    "title": "Old Man with a Gold Chain",
    "imageUrl": "https://www.artic.edu/iiif/2/3eaab3a3-2b47-9fdd-121c-050f6b8d9ccb/full/843,/0/default.jpg",
    "attributes": {
      "artist": "Rembrandt van Rijn (Dutch, 1606–1669)",
      "artistName": "Rembrandt van Rijn",
      "date": "1631",
      "medium": "Oil on panel",
      "dimensions": "83.1 × 75.7 cm (32 3/4 × 29 3/4 in.); Framed: 105.1 × 99.5 cm (41 3/8 × 39 3/16 in.)",
      "placeOfOrigin": "Holland",
      "source": "Art Institute of Chicago",
      "sourceUrl": "https://www.artic.edu/artworks/95998"
    }
  },
  {
    "externalId": "4796",
    "title": "Fishing Boats with Hucksters Bargaining for Fish",
    "imageUrl": "https://www.artic.edu/iiif/2/8641479e-c93e-f1a8-9925-19be061706da/full/843,/0/default.jpg",
    "attributes": {
      "artist": "Joseph Mallord William Turner (English, 1775–1851)",
      "artistName": "Joseph Mallord William Turner",
      "date": "1837–38",
      "medium": "Oil on canvas",
      "dimensions": "174.5 × 224.9 cm (68 3/4 × 88 1/2 in.); Framed: 216.6 × 268 cm (85 1/4 × 105 1/2 in.)",
      "placeOfOrigin": "England",
      "source": "Art Institute of Chicago",
      "sourceUrl": "https://www.artic.edu/artworks/4796"
    }
  },
  {
    "externalId": "14572",
    "title": "The Millinery Shop",
    "imageUrl": "https://www.artic.edu/iiif/2/6f513908-03cc-b974-633b-adfce56b7936/full/843,/0/default.jpg",
    "attributes": {
      "artist": "Edgar Degas (French, 1834–1917)",
      "artistName": "Hilaire Germain Edgar Degas",
      "date": "1879-86",
      "medium": "Oil on canvas",
      "dimensions": "100 × 110.7 cm (39 3/8 × 43 9/16 in.); Framed: 132.1 × 142.3 × 9.6 cm (52 × 56 × 3 3/4 in.)",
      "placeOfOrigin": "France",
      "source": "Art Institute of Chicago",
      "sourceUrl": "https://www.artic.edu/artworks/14572"
    }
  },
  {
    "externalId": "19339",
    "title": "Arlésiennes (Mistral)",
    "imageUrl": "https://www.artic.edu/iiif/2/ae6ac285-6887-dd76-4570-d379c786dfae/full/843,/0/default.jpg",
    "attributes": {
      "artist": "Paul Gauguin (French, 1848–1903)",
      "artistName": "Paul Gauguin",
      "date": "1888",
      "medium": "Oil on jute canvas",
      "dimensions": "73 × 92 cm (28 3/4 × 36 3/16 in.); Framed: 97.5 × 116.6 × 8 cm (38 3/8 × 45 7/8 × 3 1/8 in.)",
      "placeOfOrigin": "France",
      "source": "Art Institute of Chicago",
      "sourceUrl": "https://www.artic.edu/artworks/19339"
    }
  },
  {
    "externalId": "76571",
    "title": "View of Cotopaxi",
    "imageUrl": "https://www.artic.edu/iiif/2/33fc29fc-097b-576b-c9e6-c3352d9d3f15/full/843,/0/default.jpg",
    "attributes": {
      "artist": "Frederic Edwin Church (American, 1826–1900)",
      "artistName": "Frederic Edwin Church",
      "date": "1857",
      "medium": "Oil on canvas",
      "dimensions": "62.2 × 92.7 cm (24 1/2 × 36 1/2 in.)",
      "placeOfOrigin": "United States",
      "source": "Art Institute of Chicago",
      "sourceUrl": "https://www.artic.edu/artworks/76571"
    }
  },
  {
    "externalId": "4758",
    "title": "Stoke-by-Nayland",
    "imageUrl": "https://www.artic.edu/iiif/2/400ce9e8-2f67-44e2-dd68-e6c98880d27f/full/843,/0/default.jpg",
    "attributes": {
      "artist": "John Constable (English, 1776-1837)",
      "artistName": "John Constable",
      "date": "1836",
      "medium": "Oil on canvas",
      "dimensions": "126 × 169 cm (49 5/8 × 66 1/2 in.); Framed: 170.2 × 212.1 × 16.6 cm (67 × 83 1/2 × 6 1/2 in.)",
      "placeOfOrigin": "England",
      "source": "Art Institute of Chicago",
      "sourceUrl": "https://www.artic.edu/artworks/4758"
    }
  }
];
