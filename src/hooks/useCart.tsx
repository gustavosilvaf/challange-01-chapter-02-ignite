import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");
    if (storagedCart) {
      return JSON.parse(storagedCart);
    }
    return [];
  });

  const hasStock = (id: number, stock: Stock[], quantity: number) => {
    const has =
      (stock.find((element) => element.id === id)?.amount || 0) >= quantity;
    console.log({ has, quantity, stock }, quantity, id);
    return has;
  };

  const addProduct = async (productId: number) => {
    try {
      const { data: stock } = await api.get("/stock");
      const { data: products } = await api.get("/products");
      const product = products.find(({ id }: Product) => id === productId);
      const productOnCart = cart.find(({ id }: Product) => id === productId);
      if (!hasStock(productId, stock, (productOnCart?.amount || 0) + 1))
        throw new Error("Quantidade solicitada fora de estoque");

      const cartWithoutItem = cart.filter(
        ({ id }: Product) => id !== productId
      );
      const newCart = [
        ...cartWithoutItem,
        {
          ...product,
          amount: productOnCart ? productOnCart.amount + 1 : 1,
        },
      ];
      setCart(newCart);

      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
    } catch (e) {
      toast.error(e.message);
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productToRemove = cart.find(({ id }: Product) => id === productId);
      if (productToRemove)
        setCart(cart.filter(({ id }: Product) => id !== productId));
      else throw new Error("Produto não encontrado");
    } catch (e) {
      toast.error(e.message);
    }
    localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const { data: stock } = await api.get("/stock");
      const productToUpdate = cart.find(({ id }: Product) => id === productId);
      if (
        hasStock(productId, stock, (productToUpdate?.amount || 0) + amount) &&
        productToUpdate
      ) {
        const newCart = [
          ...cart.map((product: Product) =>
            product.id === productId
              ? {
                  ...product,
                  amount: product.amount + amount,
                }
              : product
          ),
        ];

        setCart(newCart);

        localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
      } else throw new Error("Quantidade solicitada fora de estoque");
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
