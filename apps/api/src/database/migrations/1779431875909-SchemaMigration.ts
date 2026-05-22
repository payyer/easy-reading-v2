import { MigrationInterface, QueryRunner } from 'typeorm';

export class SchemaMigration1779431875909 implements MigrationInterface {
  name = 'SchemaMigration1779431875909';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying(255) NOT NULL, "password_hash" text, "role" character varying(50) NOT NULL DEFAULT 'user', "is_verified" boolean NOT NULL DEFAULT false, "verification_token" character varying(255), "verification_token_expires" TIMESTAMP WITH TIME ZONE, "reset_token" character varying(255), "reset_token_expires" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "books" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(255) NOT NULL, "author" character varying(255) NOT NULL, "cover_url" text, "description" text, "status" character varying(50) NOT NULL DEFAULT 'processing', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_f3f2f25a099d24e12545b70b022" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "chapters" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "book_id" uuid NOT NULL, "chapter_number" integer NOT NULL, "title" character varying(255) NOT NULL, "summary_a1_a2" text NOT NULL, "summary_b1_b2" text NOT NULL, "summary_c1_c2" text NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a2bbdbb4bdc786fe0cb0fcfc4a0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "chapters" ADD CONSTRAINT "FK_23af8ea9e68fef63d07b189e8d1" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "chapters" DROP CONSTRAINT "FK_23af8ea9e68fef63d07b189e8d1"`,
    );
    await queryRunner.query(`DROP TABLE "chapters"`);
    await queryRunner.query(`DROP TABLE "books"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
