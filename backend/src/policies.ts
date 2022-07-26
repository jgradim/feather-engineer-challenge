import { Prisma, PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';

import prisma from './db';

interface GetPolicies {
  search?: string
  sortField?: string
  sortOrder?: Prisma.SortOrder
  page?: string
  count?: string
}

interface AddFamilyMemberInput {
  firstName: string
  lastName: string
  dateOfBirth: Date
}

interface RemoveFamilyMemberInput {
  id: string
}

interface UpdateFamilyMembersInput {
  add?: Array<AddFamilyMemberInput>
  remove?: Array<RemoveFamilyMemberInput>
}

interface UpdatePolicyInput {
  familyMembers?: UpdateFamilyMembersInput
}

const policySelect = {
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
      dateOfBirth: true,
    },
  },
}

//
//
//
export const policiesGet = async (req: Request<{}, {}, {}, GetPolicies>, res: Response) => {
  const { search, sortField, sortOrder, page, count } = req.query;

  const versions: Array<{ policyId: string }> = search
    ? await prisma.$queryRawUnsafe(`
      SELECT
        "policyId",
        jsonb_path_query(data::jsonb, '$.familyMembers[*] ? (@.firstName like_regex "${Prisma.raw(search)}" flag "i" || @.lastName like_regex "${Prisma.raw(search)}" flag "i" )')
      FROM
        "PolicyVersion"
    `)
    : [];

  const policyIds = versions.map(({ policyId }) => policyId);

  const filter: Prisma.PolicyWhereInput = search
    ? {
      OR: [
        { id: { in: policyIds } },
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
      [sortField]: sortOrder || 'asc',
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
    select: policySelect,
  });

  res.json(policies);
};

//
//
//
export const policiesHistory = async (req: Request<{id: string}, {}, {}, {}>, res: Response) => {
  const { id }: { id: string } = req.params;

  let policy;

  try {
    policy = await prisma.policy.findUnique({
      where: { id },
      rejectOnNotFound: true,
    });
  } catch (e: any) {
    if (e.name === 'NotFoundError') {
      return res.sendStatus(404);
    }

    throw e;
  }

  const versions = await prisma.policyVersion.findMany({
    where: { policyId: id },
    orderBy: { version: 'desc' },
  });

  res.json(versions);
};

//
//
//
export const policiesUpdate = async (req: Request<{id: string}, {}, UpdatePolicyInput, {}>, res: Response) => {
  const { id }: { id: string } = req.params;

  let policy: any;

  try {
    policy = await prisma.policy.findUnique({
      where: { id },
      rejectOnNotFound: true,
      select: { id: true },
    });
  } catch (e: any) {
    if (e.name === 'NotFoundError') {
      return res.sendStatus(404);
    }

    throw e;
  }

  const { familyMembers } = req.body;

  if (!familyMembers?.add && !familyMembers?.remove) return res.sendStatus(204);

  // @ts-ignore
  policy = await prisma.$transaction(async (prisma: PrismaClient) => {
    policy = await prisma.policy.findUnique({
      where: { id },
      include: {
        customer: true,
        familyMembers: true,
      },
    });

    const policyVersion = await prisma.policyVersion.create({
      data: {
        data: policy,
        version: policy.latestVersion + 1,
        policy: {
          connect: { id: policy.id },
        },
      }
    });

    const create = familyMembers.add || [];
    const deleteMany = familyMembers.remove || [];

    policy = await prisma.policy.update({
      where: { id },
      data: {
        latestVersion: policy.latestVersion + 1,
        familyMembers: { create, deleteMany },
      },
      include: { customer: true, familyMembers: true },
    });

    return policy;
  });

  res.json(policy);
};
