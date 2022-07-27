# Feather Take Home Assessment

Thank you for applying at Feather and taking the time to do this home assessment.

The goal of this project is to let you **show off your coding and problem-solving skills**, on a task that resembles the kind of work you’ll be doing with us.

This coding challenge applies to **frontend, backend, and full-stack roles**. Depending on the position you are applying for, you can focus on your specific area.

You can spend as little or as much time as you like on this project. We've added some initial boilerplate to help you get started, but **feel free to refactor every part of this app as you may seem fit**.

1. Start by reading the [Engineering challenge](#Engineering-challenge) for the position you've applied for and don't forget about the **Acceptance criteria** to have a clear idea of the requirements.
2. Use the [Getting started](#Getting-started) guide to set up a local version of the project on your machine.
3. Take a look at the [Data structure](#Data-structure) and [API](#API) to know what the data looks like.
4. Finish by answering a [couple of questions](#General-questions) about the project. You can answer them on this very same file.

## Engineering challenge

We've prepared several different user stories to work on. Depending on what position you applied to, pick one of them:
- [Backend](./backend-readme.md)
- [Frontend](./frontend-readme.md)
- [Full Stack](./full-stack-readme.md)


## Task requirements

- Make sure your feature **works as expected**
- Your code is **easy to understand** and follows best practices
- The project **runs with one command,** and without any external configuration
- **Your code has tests** to make sure the functionalities work as expected

## Getting started

1. Make sure you have [Docker](https://www.docker.com/products/docker-desktop/) installed on your machine
2. Set up the environment variables

```bash
cp ./backend/.env.example ./backend/.env
cp ./backend/.env.test.example ./backend/.env.test
```

3. Build and run the Docker image:

```bash
cd backend
docker-compose build
docker-compose up
```

4. On a new terminal, run the migration and the seed script to add initial data:

```bash
cd backend
docker compose exec backend yarn prisma migrate dev
docker compose exec backend yarn prisma db seed
```

5. That’s it!

You can see the app on `http://localhost:3000`

The API should be running on `http://localhost:4000`

** Note **
If you want to install new dependencies, you'll have to do it inside the docker container. To do that, you can use the following command:

```
docker compose exec {backend OR frontend} yarn add {the_name_of_the_package}
```

Make sure to replace the values between the curly braces `{}` with the correct ones.

## API

After following the [Getting started](#Getting-started) guide, the backend should be running on port `4000`. The backend currently have one endpoint:

| Request type | Path        | Query Params | Example                   |
| ------------ | ----------- | ------------ | ------------------------- |
| `GET`        | `/policies` | `search`     | `/policies?search=BARMER` |

Feel free to update or add more endpoints to accommodate or improve your solution.

## Data structure

### Policy

| fields         | type                            | comment                                       |
| -------------- | ------------------------------- | --------------------------------------------- |
| id             | string                          | Used to identify the policy                   |
| customer       | [Customer](#Customer)           | Object holding the customer's informations    |
| provider       | string                          | Name of the provider (Allianz, AXA…)          |
| insuranceType  | [InsuranceType](#InsuranceType) | Type of the insurance (Liability, Household…) |
| status         | [PolicyStatus](#PolicyStatus)   | Status of the insurance (Active, Cancelled)   |
| startDate      | date                            | Date when the policy should start             |
| endDate        | date                            | Date when the policy ends                     |
| createdAt      | date                            | Date when the record was created              |

### Customer

| fields      | type   | comment                       |
| ----------- | ------ | ----------------------------- |
| id          | uuid   | Used to identify the customer |
| firstName   | string | Customer’s first name         |
| lastName    | string | Customer’s last name          |
| dateOfBirth | date   | Customer’s date of birth      |

### InsuranceType

`InsuranceType` can be of `LIABILITY`, `HOUSEHOLD`, `HEALTH`

### PolicyStatus

`PolicyStatus` can be of `ACTIVE`, `PENDING`, `CANCELLED` and `DROPPED_OUT`

## General questions

### How much time did you spend working on the solution?

- 24/07: 16:00 - 19:00 (3h)
- 25/07: 15:30 - 16:30, 19:00 - 24:00 (6h)
- 26/07: 17:00 - 20:00 (3h), 22:00 - 23:00 (1h)
- 37/07: 15:00 - 16:30 (1h)

Total: 13h30

### What’s the part of the solution you are most proud of?

Nothing in particular, I feel everything is pretty standard and straightforward, except for the case insensitive, partial search on policy versions.

The choice to serialize a `policy` and its related records as a `JSON` field does not allow for case insensitive searching using the prisma query engine alone; This was solved by executing a raw SQL query with prisma client. However, only the `$queryRawUnsafe` method returns the expected values, which forces us to manually escape the `search` user input using `Prisma.raw()`.

[This issue is currently open, and without reply from the authors](https://github.com/prisma/prisma/issues/7390)

That said, I was surprised at how easy it was to filter on deeply nested properties and collections in a `JSON` column using `jsonb_path_*` functions in Postgres:

```js
await prisma.$queryRawUnsafe(`
  SELECT
    "policyId",
    jsonb_path_query(data::jsonb, '$.familyMembers[*] ? (@.firstName like_regex "${Prisma.raw(search)}" flag "i" || @.lastName like_regex "${Prisma.raw(search)}" flag "i" )')
  FROM
    "PolicyVersion"
`)
```

### If you had more time, what other things you would like to do?

- Setup turborepo + GitHub Actions for CI.
- Dive deeper into Typescript / Prisma types to remove all `// @ts-ignore` usage

### Do you have any feedback regarding this coding challenge?

[backend] It's not clear what kind of updates are possible for a policy; besides adding and removing family members, what else can a customer edit?

[backend] It's also not very clear _what_ a family member is. I ended up modeling them to have the same properties as a customer as it allowed fot respecting the acceptance criteria.

I would also organize the monorepo differently.

Do not keep `docker-compose`'s `.env` in the `./backend` folder; it seems to be there just to play nice with Prisma  - a `.env` can be added to `./backend/prisma` to solve this - but, conceptually, it should be at the same level as the `docker-compose.yml` file. This removes the need to navigate to a deeper folder to run commands, and also simplifies `docker-compose.yml`, as the `env_file` property can be ommited.
