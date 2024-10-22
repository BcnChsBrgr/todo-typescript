type TokenType =
    | "KEYWORD"
    | "SUBQUERY"
    | "IDENTIFIER"
    | "STRING"
    | "NUMBER"
    | "OPERATOR"
    | "PAREN"
    | "COMMA"
    | "SEMICOLON";

interface Token {
    type: TokenType;
    value: string;
}

interface BasicWhere {
    left: string;
    operator: string;
    right: string[] | number[] | string | number | ParseInterface[] | null;
}

interface ParseInterface {
    type: "SELECT" | "UPDATE" | "DELETE" | "CREATE_TABLE";
    columns?: string | string[];
    table: string | null;
    set?: Record<string, any>;
    where?: BasicWhere[];
}

class Token implements Token {
    constructor(type: TokenType, value: string) {
        this.type = type;
        this.value = value;
    }

    getType(): TokenType {
        return this.type;
    }

    getValue(): string {
        return this.value;
    }
}

const keywords = new Set([
    "SELECT",
    "UPDATE",
    "DELETE",
    "CREATE",
    "TABLE",
    "FROM",
    "WHERE",
    "SET",
    "VALUES",
    "INSERT",
    "INTO",
    "AND",
    "OR",
    "NOT",
    "NULL",
    "PRIMARY",
    "KEY",
    "VARCHAR",
    "INT",
    "CHAR",
    "IF",
    "EXISTS",
]);

export class SQLParser {
    private sql: string;
    private tokens: Token[];
    private current: number;

    constructor(sql: string) {
        this.sql = sql;
        this.tokens = this.tokenize(this.sql);
        this.current = 0;
    }

    private hasMoreToken(): boolean {
        return this.current < this.tokens.length;
    }

    private tokenize(sql: string): Token[] {
        const tokens: Token[] = [];
        const re =
            /\s*(?<operator>=|<=|>=|==|!=|<>|>|<|=|IN|[*<>])|(?<subquery>\(SELECT.*?FROM.*?\))|(?<semicolon>;)|(?<paren>[(|)])|(?<comma>,)|(?<keyword>\b(?:SELECT|UPDATE|DELETE|CREATE|TABLE|FROM|WHERE|SET|VALUES|INSERT|INTO|AND|OR|NOT|NULL|PRIMARY|KEY|VARCHAR|INT|CHAR|IF|EXISTS)\b)|(?<doubleQuotedString>".*?")|(?<singleQuotedString>'.*?')|(?<number>\d+)|(?<identifier>\w+)\s*/gi;

        let match: RegExpExecArray | null;

        while ((match = re.exec(sql)) !== null) {
            const [value] = match;

            if (match?.groups?.keyword) {
                tokens.push(
                    new Token("KEYWORD", match.groups.keyword.toUpperCase())
                );
            } else if (match?.groups?.subquery) {
                tokens.push(new Token("SUBQUERY", match.groups.subquery));
            } else if (match?.groups?.number) {
                tokens.push(new Token("NUMBER", match?.groups?.number));
            } else if (/^['"].*['"]$/.test(value.trim())) {
                tokens.push(new Token("STRING", value));
            } else if (match?.groups?.operator) {
                tokens.push(new Token("OPERATOR", match?.groups?.operator));
            } else if (match?.groups?.comma) {
                tokens.push(new Token("COMMA", match?.groups?.comma));
            } else if (match?.groups?.paren) {
                tokens.push(new Token("PAREN", match?.groups?.paren));
            } else if (match?.groups?.semicolon) {
                tokens.push(new Token("SEMICOLON", match?.groups?.semicolon));
            } else {
                tokens.push(new Token("IDENTIFIER", value.trim()));
            }
        }

        return tokens;
    }

    private currentToken(): Token {
        return this.tokens[this.current];
    }

    private eat(type: TokenType): Token | null {
        if (this.hasMoreToken()) {
            if (this.currentToken()?.type === type) {
                return this.tokens[this.current++];
            }
        }

        return null;
    }

    private parseIdentifier(): string | null {
        if (this.hasMoreToken()) {
            const token = this.eat("IDENTIFIER");
            if (token) return token.value;
        }

        return null;
    }

    private parseNumber(): number | null {
        if (this.hasMoreToken()) {
            const token = this.eat("NUMBER");
            if (token) return parseInt(token.value, 10);
        }

        return null;
    }

    private parseString(): string | null {
        if (this.hasMoreToken()) {
            const token = this.eat("STRING");
            if (token) return token.value.slice(1, -1); // Remove surrounding quotes
        }
        return null;
    }

    private parseOperator(): string | null {
        if (this.hasMoreToken()) {
            const token = this.eat("OPERATOR");
            if (token) return token.value;
        }
        return null;
    }

    private parseParentheses(): string | null {
        if (this.hasMoreToken()) {
            const token = this.eat("PAREN");
            return token ? token.value : null;
        }
        return null;
    }

    private parseComma(): void {
        this.eat("COMMA");
    }

    private parseSemicolon(): void {
        this.eat("SEMICOLON");
    }

    private parseWhere(): any {
        const where: any[] = [];
        const tmp: any[] = [];
        const and: any[] = [];
        const or: any[] = [];

        if (
            this.hasMoreToken() &&
            this.currentToken().value.toUpperCase() === "WHERE" &&
            this.eat("KEYWORD") // eat 'WHERE'
        ) {
            let i = 0;
            while (
                this.hasMoreToken() &&
                this.currentToken().type !== "KEYWORD"
            ) {
                tmp.push(this.parseExpression());
                if (
                    this.hasMoreToken() &&
                    this.eat("KEYWORD")?.value.toUpperCase() === "OR"
                ) {
                    or.push(tmp.shift());
                } else {
                    and.push(tmp.shift());
                }
            }
            if (and.length > 0) {
                where.push({
                    operator: "and",
                    condition: and,
                });
            }
            if (or.length > 0) {
                where.push({
                    operator: "or",
                    condition: or,
                });
            }
        }
        const left = this.hasMoreToken() ? this.parseIdentifier() : null;

        const operator = this.hasMoreToken() ? this.parseOperator() : null;

        let right: any;

        if (operator !== null) {
            if (operator.toUpperCase() !== "IN") {
                right =
                    this.parseIdentifier() ??
                    this.parseString() ??
                    this.parseNumber();
            } else {
            }
            return { left, operator, right };
        }

        throw new Error(
            `Unexpected Parse were near ` + this.tokens[--this.current]
        );
    }

    private parseExpression(): BasicWhere {
        // Simplified expression parsing
        const left = this.hasMoreToken() ? this.parseIdentifier() : null;

        const operator = this.hasMoreToken() ? this.parseOperator() : null;

        if (left === null || operator === null) {
            throw new Error("Expected identifier");
        }
        let tmp: any;

        if (operator != null) {
            if (operator.toUpperCase() === "IN") {
                tmp = [];

                if (this.currentToken().type === "SUBQUERY") {
                    let tmpSQLString: Token = this.eat("SUBQUERY") as Token;
                    let _tmp: SQLParser = new SQLParser(
                        tmpSQLString.value.slice(1, -1)
                    );
                    tmp.push(_tmp.parse());
                    return { left, operator, right: tmp };
                }
                this.eat("PAREN"); // eat '('
                while (
                    ["IDENTIFIER", "STRING", "NUMBER"].includes(
                        this.currentToken().type
                    )
                ) {
                    let valuesToCheck: string | number | null =
                        this.parseIdentifier() ??
                        this.parseString() ??
                        this.parseNumber();

                    if (!tmp.includes(valuesToCheck)) {
                        tmp.push(valuesToCheck);
                    }
                    if (this.hasMoreToken() && this.eat("COMMA")) continue;
                }
                this.eat("PAREN"); // eat ')'
            } else {
                tmp =
                    this.parseIdentifier() ??
                    this.parseString() ??
                    this.parseNumber();
            }
            return { left, operator, right: tmp };
        }
        throw new Error(`unexpected parse where near ` + this.sql);
    }

    private parseSelect(): ParseInterface {
        const columns: string[] = [];
        this.eat("KEYWORD"); // Skip 'SELECT'

        while (this.currentToken().type === "IDENTIFIER") {
            columns.push(this.parseIdentifier() as string);
            if (this.eat("COMMA")) continue;
            break;
        }

        this.eat("KEYWORD"); // Skip 'FROM'
        const table = this.parseIdentifier();

        const where: any[] = [];
        const tmp: any[] = [];
        const and: any[] = [];
        const or: any[] = [];
        if (
            this.hasMoreToken() &&
            this.currentToken().value.toUpperCase() === "WHERE" &&
            this.eat("KEYWORD") // eat 'where'
        ) {
            let i = 0;
            while (
                this.hasMoreToken() &&
                this.currentToken().type !== "KEYWORD"
            ) {
                i++;

                tmp.push(this.parseExpression());
                if (
                    this.hasMoreToken() &&
                    this.eat("KEYWORD")?.value.toLowerCase() === "or"
                ) {
                    // eat 'and' or 'or'
                    or.push(tmp.shift());
                    continue;
                } else {
                    and.push(tmp.shift());
                }
            }
            if (and.length > 0) {
                where.push({
                    operator: "and",
                    condition: and,
                });
            }
            if (or.length > 0) {
                where.push({
                    operator: "or",
                    condition: or,
                });
            }
        }

        return { type: "SELECT", columns, table, where };
    }

    private parseUpdate(): ParseInterface {
        this.eat("KEYWORD"); // Skip 'UPDATE'
        const table = this.parseIdentifier();

        this.eat("KEYWORD"); // Skip 'SET'
        const set: Record<string, any> = {};
        while (
            this.hasMoreToken() &&
            this.currentToken().type === "IDENTIFIER"
        ) {
            const column = this.parseIdentifier() as string;
            this.eat("OPERATOR"); // Skip '='
            const value = this.parseString() ?? this.parseNumber();
            set[column] = value;

            if (this.hasMoreToken() && this.eat("COMMA")) continue;
            break;
        }

        let where: any = [];

        if (this.hasMoreToken() && this.eat("KEYWORD")?.value === "WHERE") {
            while (
                this.hasMoreToken() &&
                this.currentToken().type !== "KEYWORD"
            ) {
                where.push(this.parseExpression());
                if (
                    this.hasMoreToken() &&
                    this.currentToken().type === "KEYWORD"
                ) {
                    this.eat("KEYWORD");
                    continue;
                }
            }
        }

        return { type: "UPDATE", table, set, where };
    }

    private parseDelete(): ParseInterface {
        this.eat("KEYWORD"); // Skip 'DELETE'
        this.eat("KEYWORD"); // Skip 'FROM'
        const table = this.parseIdentifier();

        let where: any = null;
        if (this.eat("KEYWORD")?.value === "WHERE") {
            where = this.parseExpression();
        }

        return { type: "DELETE", table, where };
    }

    private parseCreateTable(): ParseInterface {
        this.eat("KEYWORD"); // Skip 'CREATE'
        this.eat("KEYWORD"); // Skip 'TABLE'
        const table = this.parseIdentifier();

        const columns: any[] = [];
        this.eat("PAREN"); // Skip '('
        while (this.currentToken().type === "IDENTIFIER") {
            const column = this.parseIdentifier();
            const type = this.parseIdentifier();
            columns.push({ name: column, dataType: type });

            if (this.eat("COMMA")) continue;
            break;
        }
        this.eat("PAREN"); // Skip ')'

        return { type: "CREATE_TABLE", table, columns };
    }

    public parse(): ParseInterface {
        if (
            this.currentToken().type === "KEYWORD" &&
            ["SELECT", "UPDATE", "DELETE", "CREATE"].includes(
                this.currentToken().value.toUpperCase()
            )
        ) {
            switch (this.currentToken().getValue().toUpperCase()) {
                case "SELECT":
                    return this.parseSelect();
                    break;
                case "UPDATE":
                    return this.parseUpdate();
                    break;
                case "DELETE":
                    return this.parseDelete();
                    break;
                case "CREATE":
                    this.eat("KEYWORD"); //eat keyword 'table'
                    return this.parseCreateTable();
                    break;
            }
        }
        throw new Error(`Unexpected token: ${this.currentToken().value}`);
    }
}
