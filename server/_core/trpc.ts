import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { hasTrustedMutationOrigin } from "./security";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireTrustedMutationOrigin = t.middleware(async opts => {
  if (opts.type === "mutation" && !hasTrustedMutationOrigin(opts.ctx.req)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Untrusted mutation origin" });
  }
  return opts.next();
});

export const securePublicMutation = t.procedure.use(requireTrustedMutationOrigin);

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  if (opts.type === "mutation" && !hasTrustedMutationOrigin(ctx.req)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Untrusted mutation origin" });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(requireTrustedMutationOrigin).use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
