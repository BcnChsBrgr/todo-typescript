type TokenType =
    | "KEYWORD"
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
    private tokens: Token[];
    private current: number;

    constructor(sql: string) {
        this.tokens = this.tokenize(sql);
        this.current = 0;
    }

    private tokenize(sql: string): Token[] {
        const tokens: Token[] = [];
        const re =
            /\s*(=>|<=|>=|==|!=|<>|>|<|=|[(),;*<>]|\b(?:SELECT|UPDATE|DELETE|CREATE|TABLE|FROM|WHERE|SET|VALUES|INSERT|INTO|AND|OR|NOT|NULL|PRIMARY|KEY|VARCHAR|INT|CHAR|IF|EXISTS)\b|".*?"|'.*?'|\d+|\w+)\s*/gi;
        let match: RegExpExecArray | null;

        while ((match = re.exec(sql)) !== null) {
            const [value] = match;

            const upperValue = value.toUpperCase().trim();

            if (keywords.has(upperValue)) {
                tokens.push(new Token("KEYWORD", upperValue));
            } else if (/^\d+$/.test(value)) {
                tokens.push(new Token("NUMBER", value));
            } else if (/^['"].*['"]$/.test(value.trim())) {
                tokens.push(new Token("STRING", value));
            } else if (/^(<>|>=|<=|!=|<|>|=)/.test(value)) {
                tokens.push(new Token("OPERATOR", value));
            } else if (value.trim() === ",") {
                tokens.push(new Token("COMMA", value));
            } else if (value === "(" || value === ")") {
                tokens.push(new Token("PAREN", value));
            } else if (value === ";") {
                tokens.push(new Token("SEMICOLON", value));
            } else {
                tokens.push(new Token("IDENTIFIER", value));
            }
        }

        console.log(tokens);

        return tokens;
    }

    private currentToken(): Token {
        return this.tokens[this.current];
    }

    private eat(type: TokenType): Token | null {
        if (this.currentToken().getType() === type) {
            return this.tokens[this.current++];
        }

        return null;
    }

    private parseIdentifier(): string | null {
        const token = this.eat("IDENTIFIER");
        if (token) return token.value;
        return null;
        // throw new Error("Expected identifier");
    }

    private parseNumber(): number | null {
        const token = this.eat("NUMBER");
        if (token) return parseInt(token.value, 10);
        return null;
    }

    private parseString(): string | null {
        const token = this.eat("STRING");
        if (token) return token.value.slice(1, -1); // Remove surrounding quotes

        return null;
        // throw new Error("Expected identifier");
    }

    private parseOperator(): string {
        const token = this.eat("OPERATOR");
        if (token) return token.value;
        throw new Error("Expected operator");
    }

    private parseParentheses(): string | null {
        const token = this.eat("PAREN");
        return token ? token.value : null;
    }

    private parseComma(): void {
        this.eat("COMMA");
    }

    private parseSemicolon(): void {
        this.eat("SEMICOLON");
    }

    private parseExpression(): any {
        // Simplified expression parsing
        //console.log(this.parseIdentifier());
        const left = this.parseIdentifier();
        const operator = this.parseOperator();
        const right =
            this.parseIdentifier() ?? this.parseString() ?? this.parseNumber();
        return { left, operator, right };
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

        let where: any = null;
        if (this.eat("KEYWORD")?.value === "WHERE") {
            where = this.parseExpression();
        }

        return { type: "SELECT", columns, table, where };
    }

    private parseUpdate(): any {
        this.eat("KEYWORD"); // Skip 'UPDATE'
        const table = this.parseIdentifier();

        this.eat("KEYWORD"); // Skip 'SET'
        const set: Record<string, any> = {};
        while (this.currentToken().type === "IDENTIFIER") {
            const column = this.parseIdentifier() as string;
            this.eat("OPERATOR"); // Skip '='
            const value = this.parseString() ?? this.parseNumber();
            set[column] = value;

            if (this.eat("COMMA")) continue;
            break;
        }

        let where: any = null;
        if (this.eat("KEYWORD")?.value === "WHERE") {
            where = this.parseExpression();
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
