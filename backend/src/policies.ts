import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

import prisma from './db';

interface GetPolicies {
  search?: string
  sortField?: string
  sortOrder?: Prisma.SortOrder
  page?: string
  count?: string
}

interface FamilyMember {
  firstName: string
  lastName: string
  birthDate: string
}

interface UpdateFamilyMembers {
  add?: Array<FamilyMember>
  remove?: Array<string>
}

interface UpdatePolicy {
  familyMembers?: UpdateFamilyMembers
}

export const policiesGet = async (req: Request<{}, {}, {}, GetPolicies>, res: Response) => {
  const { search, sortField, sortOrder, page, count } = req.query;

  const filter: Prisma.PolicyWhereInput = search
    ? {
      OR: [
        { provider: { contains: search, mode: 'insensitive' } },
        { customer: { firstName: { contains: search, mode: 'insensitive' } } },
        { customer: { lastName: { contains: search, mode: 'insensitive' } } },
        { familyMembers: { some: { firstName: { contains: search, mode: 'insensitive' } } } },
        { familyMembers: { some: { lastName: { contains: search, mode: 'insensitive' } } } },
      ],
    }
    : {};

  const sort: Prisma.PolicyOrderByWithAggregationInput = sortField
    ? {
      [sortField]: sortOrder ?? 'asc',
    }
    : {};

  const pCount = parseInt(count || '', 10);
  const pPage = parseInt(page || '', 10);

  const paginate: { take?: number, skip?: number } = count && page
    ? {
      take: Math.max(0, pCount) || 0,
      skip: Math.max(0, ((pPage - 1) * pCount)) || 0,
    }
    : {};

  const policies = await prisma.policy.findMany({
    ...paginate,
    where: {
      ...filter,
    },
    orderBy: {
      ...sort,
    },
    select: {
      id: true,
      provider: true,
      insuranceType: true,
      status: true,
      startDate: true,
      endDate: true,
      customer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          dateOfBirth: true
        }
      },
      familyMembers: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          dateOfBirth: true
        },
      },
      versions: {

      }
    }
  });

  res.json(policies);
};
