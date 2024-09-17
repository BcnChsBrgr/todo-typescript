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
        // throw new Error("Expected identifier");
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

    private parseExpression(): any {
        // Simplified expression parsing
        const left = this.hasMoreToken() ? this.parseIdentifier() : null;

        const operator = this.hasMoreToken() ? this.parseOperator() : null;
        let right: any;
        if (operator != null) {
            if (operator.toUpperCase() === "IN") {
                right = [];

                if (this.currentToken().type === "SUBQUERY") {
                    let tmpSQLString: Token = this.eat("SUBQUERY") as Token;
                    let _tmp = new SQLParser(tmpSQLString.value.slice(1, -1));
                    right.push(_tmp.parse());
                    return { left, operator, right };
                }
                this.eat("PAREN"); // eat '('
                while (
                    ["IDENTIFIER", "STRING", "NUMBER"].includes(
                        this.currentToken().type
                    )
                ) {
                    right.push(
                        this.parseIdentifier() ??
                            this.parseString() ??
                            this.parseNumber()
                    );
                    if (this.hasMoreToken() && this.eat("COMMA")) continue;
                }
                this.eat("PAREN"); // eat ')'
            } else {
                right =
                    this.parseIdentifier() ??
                    this.parseString() ??
                    this.parseNumber();
            }
            return { left, operator, right };
        }
        throw Error(`unexpected parse where near ` + this.sql);
    }

    private parseSelect(): any {
        const columns: string[] = [];
        this.eat("KEYWORD"); // Skip 'SELECT'

        while (this.currentToken().type === "IDENTIFIER") {
            columns.push(this.parseIdentifier() as string);
            if (this.eat("COMMA")) continue;
            break;
        }

        this.eat("KEYWORD"); // Skip 'FROM'
        const table = this.parseIdentifier();

        const where: any = [];

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

                where.push(this.parseExpression());
                if (this.hasMoreToken() && this.eat("KEYWORD")) {
                    // eat 'and' or 'or'
                    continue;
                }
            }
        }

        return { type: "SELECT", columns, table, where };
    }

    private parseUpdate(): any {
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

    private parseDelete(): any {
        this.eat("KEYWORD"); // Skip 'DELETE'
        this.eat("KEYWORD"); // Skip 'FROM'
        const table = this.parseIdentifier();

        let where: any = null;
        if (this.eat("KEYWORD")?.value === "WHERE") {
            where = this.parseExpression();
        }

        return { type: "DELETE", table, where };
    }

    private parseCreateTable(): any {
        this.eat("KEYWORD"); // Skip 'CREATE'
        this.eat("KEYWORD"); // Skip 'TABLE'
        const tableName = this.parseIdentifier();

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

        return { type: "CREATE_TABLE", tableName, columns };
    }

    public parse(): any {
        const token = this.currentToken();
        if (token.type === "KEYWORD") {
            switch (token.value) {
                case "SELECT":
                    return this.parseSelect();
                case "UPDATE":
                    return this.parseUpdate();
                case "DELETE":
                    return this.parseDelete();
                case "CREATE":
                    if (this.tokens[this.current + 1].value === "TABLE") {
                        return this.parseCreateTable();
                    }
                    break;
                default:
                    throw new Error(`Unexpected keyword: ${token.value}`);
            }
        }
        throw new Error(`Unexpected token: ${token.value}`);
    }
}
