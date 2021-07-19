import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product } from "../types";

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

  const addProduct = async (productId: number) => {
    try {
      const responseProduct = await api.get(`/products/${productId}`);
      const { status, data: product } = responseProduct;

      if (status >= 400) toast.error("Erro na adição do produto");
      const { data: stock } = await api.get(`/stock/${productId}`);
      const productOnCart = cart.find(({ id }: Product) => id === productId);

      if ((productOnCart?.amount || 0) + 1 > stock.amount)
        throw new Error("Quantidade solicitada fora de estoque");

      if (!productOnCart) {
        const newCart = [...cart, { ...product, amount: 1 }];
        setCart(newCart);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
      } else {
        const newCart = cart.map((element) =>
          element.id === productId
            ? { ...element, amount: element.amount + 1 }
            : element
        );
        setCart(newCart);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
      }
    } catch (e) {
      toast.error(e.message);
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productToRemove = cart.find(({ id }: Product) => id === productId);
      if (productToRemove) {
        const newCart = cart.filter(({ id }: Product) => id !== productId);
        setCart(newCart);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
      } else throw new Error("Erro na remoção do produto");
    } catch (e) {
      toast.error(e.message);
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const { status, data: stock } = await api.get(`/stock/${productId}`);
      if (status >= 400)
        if (amount > stock.amount || amount <= 0) {
          throw new Error("Quantidade solicitada fora de estoque");
        } else {
          const newCart = [
            ...cart.map((product: Product) =>
              product.id === productId
                ? {
                    ...product,
                    amount,
                  }
                : product
            ),
          ];

          setCart(newCart);

          localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
        }
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
